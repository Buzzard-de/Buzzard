import { runCustomsPrecheck } from "@/lib/customs-fulfillment-gate/precheck";
import { resolveFulfillmentOrigin } from "./fulfillmentOrigin";
import { selectCarrier } from "./carrierSelection";
import { cachePipelineSnapshot, getCachedPipelineSnapshot } from "./idempotency";
import { estimateParcelWeightKg, quoteShipping } from "./shippingQuote";
import { resolveTargetCountry } from "./targetCountry";
import { classifyTradeRoute } from "./tradeRoute";
import type { TradeRoutePipelineInput, TradeRoutePipelineResult, TradeRouteFulfillmentSnapshot } from "./types";

const PIPELINE_VERSION = "1.0.0";
const DEFAULT_DIMENSIONS = { length: 40, width: 30, height: 20 };

function buildSnapshot(
  partial: Omit<TradeRouteFulfillmentSnapshot, "pipelineVersion" | "idempotencyKeys"> & {
    idempotencyKeys: Record<string, string>;
  },
): TradeRouteFulfillmentSnapshot {
  return { pipelineVersion: PIPELINE_VERSION, ...partial };
}

/**
 * End-to-end trade route → customs → shipping → carrier integration pipeline.
 * Idempotent per order + idempotencyKey. No production side effects.
 */
export function runTradeRouteFulfillmentPipeline(
  input: TradeRoutePipelineInput,
): TradeRoutePipelineResult {
  const events: TradeRoutePipelineResult["events"] = [];
  const idempotencyKeys = {
    pipeline: input.idempotencyKey,
    customs: `${input.idempotencyKey}:customs`,
    shipping: `${input.idempotencyKey}:shipping`,
    carrier: `${input.idempotencyKey}:carrier`,
  };

  const cached = getCachedPipelineSnapshot(input.orderId, input.idempotencyKey);
  if (cached) {
    return { ok: !cached.holdReason, snapshot: cached, events };
  }

  const target = resolveTargetCountry({
    shippingAddressCountry: input.shippingAddress.country,
    marketId: input.marketId,
    validatedCheckoutCountry: input.validatedCheckoutCountry,
  });

  events.push({
    type: target.ok ? "TARGET_COUNTRY_RESOLVED" : "COUNTRY_MISMATCH",
    metadata: {
      country: target.country,
      source: target.source,
      marketId: target.marketId,
      shippingCountry: target.shippingCountry,
    },
  });

  if (!target.ok || !target.country || !target.source) {
    const snapshot = buildSnapshot({
      targetCountry: target.shippingCountry ?? input.shippingAddress.country,
      targetCountrySource: "market",
      originCountry: "ORIGIN_UNKNOWN",
      tradeRoute: "UNKNOWN",
      tradeRouteFlags: classifyTradeRoute({
        originCountry: "UNKNOWN",
        destinationCountry: target.shippingCountry ?? "UNKNOWN",
      }).flags,
      holdReason:
        target.errorCode === "TRADE_ROUTE_COUNTRY_MISMATCH"
          ? "TRADE_ROUTE_COUNTRY_MISMATCH"
          : undefined,
      holdMessage: target.errorMessage,
      idempotencyKeys,
    });
    cachePipelineSnapshot(input.orderId, input.idempotencyKey, snapshot);
    return {
      ok: false,
      snapshot,
      errorCode: target.errorCode === "TRADE_ROUTE_COUNTRY_MISMATCH"
        ? "TRADE_ROUTE_COUNTRY_MISMATCH"
        : "INVALID_COUNTRY",
      errorMessage: target.errorMessage,
      events,
    };
  }

  const origin = resolveFulfillmentOrigin({ supplier: input.supplier });
  events.push({
    type: origin.ok ? "FULFILLMENT_ORIGIN_RESOLVED" : "ORIGIN_UNKNOWN",
    metadata: { originCountry: origin.originCountry, source: origin.source },
  });

  if (!origin.ok || !origin.originCountry) {
    const snapshot = buildSnapshot({
      targetCountry: target.country,
      targetCountrySource: target.source,
      originCountry: "ORIGIN_UNKNOWN",
      tradeRoute: "UNKNOWN",
      tradeRouteFlags: classifyTradeRoute({
        originCountry: "UNKNOWN",
        destinationCountry: target.country,
      }).flags,
      holdReason: "ORIGIN_UNKNOWN",
      holdMessage: origin.errorMessage,
      idempotencyKeys,
    });
    cachePipelineSnapshot(input.orderId, input.idempotencyKey, snapshot);
    return { ok: false, snapshot, errorCode: "ORIGIN_UNKNOWN", errorMessage: origin.errorMessage, events };
  }

  const route = classifyTradeRoute({
    originCountry: origin.originCountry,
    destinationCountry: target.country,
  });

  events.push({
    type: "TRADE_ROUTE_CLASSIFIED",
    metadata: {
      tradeRoute: route.tradeRoute,
      originCountry: route.originCountry,
      destinationCountry: route.destinationCountry,
    },
  });

  if (route.tradeRoute === "UNKNOWN") {
    const snapshot = buildSnapshot({
      targetCountry: target.country,
      targetCountrySource: target.source,
      originCountry: origin.originCountry,
      originSource: origin.source,
      tradeRoute: route.tradeRoute,
      tradeRouteFlags: route.flags,
      holdReason: "TRADE_ROUTE_UNKNOWN",
      holdMessage: "TRADE_ROUTE_UNKNOWN",
      idempotencyKeys,
    });
    cachePipelineSnapshot(input.orderId, input.idempotencyKey, snapshot);
    return { ok: false, snapshot, errorCode: "TRADE_ROUTE_UNKNOWN", errorMessage: "TRADE_ROUTE_UNKNOWN", events };
  }

  events.push({ type: "CUSTOMS_PRECHECK_STARTED", metadata: { tradeRoute: route.tradeRoute } });

  const customs = runCustomsPrecheck({
    orderId: input.orderId,
    idempotencyKey: idempotencyKeys.customs,
    tradeRoute: route,
    supplierOrigin: origin.originCountry,
    items: input.items,
  });

  if (customs.decision === "CUSTOMS_NOT_REQUIRED") {
    events.push({ type: "CUSTOMS_NOT_REQUIRED", metadata: { tradeRoute: route.tradeRoute } });
  } else if (customs.decision === "CUSTOMS_READY") {
    events.push({ type: "CUSTOMS_READY", metadata: { dutyEstimate: customs.dutyEstimate } });
  } else if (customs.decision === "CUSTOMS_REVIEW_REQUIRED") {
    events.push({
      type: "CUSTOMS_REVIEW_REQUIRED",
      metadata: { missingFields: customs.missingFields },
    });
  } else {
    events.push({ type: "CUSTOMS_BLOCKED", metadata: { reason: customs.reason } });
  }

  if (customs.hold) {
    const snapshot = buildSnapshot({
      targetCountry: target.country,
      targetCountrySource: target.source,
      originCountry: origin.originCountry,
      originSource: origin.source,
      tradeRoute: route.tradeRoute,
      tradeRouteFlags: route.flags,
      customsDecision: customs.decision,
      customsHold: true,
      customsMissingFields: customs.missingFields,
      customsReason: customs.reason,
      dutyEstimate: customs.dutyEstimate,
      taxEstimate: customs.taxEstimate,
      exportRequired: customs.exportRequired,
      importRequired: customs.importRequired,
      holdReason: "CUSTOMS_HOLD",
      holdMessage: customs.reason ?? customs.decision,
      idempotencyKeys,
    });
    events.push({ type: "CUSTOMS_HOLD", metadata: { decision: customs.decision } });
    cachePipelineSnapshot(input.orderId, input.idempotencyKey, snapshot);
    return { ok: false, snapshot, errorCode: "CUSTOMS_HOLD", errorMessage: customs.decision, events };
  }

  const primaryItem = input.items[0];
  const weightKg = estimateParcelWeightKg(input.items.length, input.weightKg);
  const dimensions = input.dimensionsCm ?? DEFAULT_DIMENSIONS;

  const shipping = quoteShipping({
    originCountry: origin.originCountry,
    destinationCountry: target.country,
    postalCode: input.shippingAddress.postalCode,
    weight: weightKg,
    productId: primaryItem.productId,
    supplierId: primaryItem.supplierId,
    targetCurrency: input.currency,
    serviceLevel: input.serviceLevel,
  });

  if (!shipping.ok) {
    const snapshot = buildSnapshot({
      targetCountry: target.country,
      targetCountrySource: target.source,
      originCountry: origin.originCountry,
      originSource: origin.source,
      tradeRoute: route.tradeRoute,
      tradeRouteFlags: route.flags,
      customsDecision: customs.decision,
      holdReason: "SHIPPING_HOLD",
      holdMessage: shipping.errorMessage,
      idempotencyKeys,
    });
    cachePipelineSnapshot(input.orderId, input.idempotencyKey, snapshot);
    return { ok: false, snapshot, errorCode: "SHIPPING_HOLD", errorMessage: shipping.errorMessage, events };
  }

  events.push({
    type: "SHIPPING_QUOTED",
    metadata: { cost: shipping.shippingCost, currency: shipping.shippingCurrency },
  });

  const carrier = selectCarrier({
    originCountry: origin.originCountry,
    destinationCountry: target.country,
    tradeRoute: route.tradeRoute,
    weightKg,
    dimensionsCm: dimensions,
    serviceLevel: input.serviceLevel,
    shippingCost: shipping.shippingCost,
    shipmentId: input.orderId,
    idempotencyKey: idempotencyKeys.carrier,
  });

  if (!carrier.ok) {
    const snapshot = buildSnapshot({
      targetCountry: target.country,
      targetCountrySource: target.source,
      originCountry: origin.originCountry,
      originSource: origin.source,
      tradeRoute: route.tradeRoute,
      tradeRouteFlags: route.flags,
      customsDecision: customs.decision,
      shippingQuoted: true,
      shippingCost: shipping.shippingCost,
      shippingCurrency: shipping.shippingCurrency,
      holdReason: "SHIPPING_HOLD",
      holdMessage: carrier.errorMessage,
      idempotencyKeys,
    });
    events.push({ type: "SHIPPING_HOLD", metadata: { evaluated: carrier.evaluatedCarriers } });
    cachePipelineSnapshot(input.orderId, input.idempotencyKey, snapshot);
    return { ok: false, snapshot, errorCode: "SHIPPING_HOLD", errorMessage: carrier.errorMessage, events };
  }

  events.push({
    type: "CARRIER_SELECTED",
    metadata: {
      carrierId: carrier.carrierId,
      serviceLevel: carrier.serviceLevel,
      trackingSupported: carrier.trackingSupported,
    },
  });

  const snapshot = buildSnapshot({
    targetCountry: target.country,
    targetCountrySource: target.source,
    originCountry: origin.originCountry,
    originSource: origin.source,
    tradeRoute: route.tradeRoute,
    tradeRouteFlags: route.flags,
    customsDecision: customs.decision,
    customsHold: false,
    dutyEstimate: customs.dutyEstimate,
    taxEstimate: customs.taxEstimate,
    exportRequired: customs.exportRequired,
    importRequired: customs.importRequired,
    shippingQuoted: true,
    shippingCost: carrier.shippingCost ?? shipping.shippingCost,
    shippingCurrency: shipping.shippingCurrency,
    carrierId: carrier.carrierId,
    carrierServiceLevel: carrier.serviceLevel,
    estimatedDelivery: carrier.estimatedDelivery,
    trackingSupported: carrier.trackingSupported,
    completedAt: new Date().toISOString(),
    idempotencyKeys,
  });

  cachePipelineSnapshot(input.orderId, input.idempotencyKey, snapshot);
  return { ok: true, snapshot, events };
}
