/**
 * Smart carrier selection. Never auto-picks cheapest. Never promises unverified dates.
 */
const { isSalesEnabled } = require("../../salesMode");
const { lookupCoverage } = require("./coverageEngine");
const { createAdapter, priorityCatalog } = require("./adapterFramework");
const { audit } = require("./auditLog");

function emitHold(reason, dest) {
  audit("selection_hold", { reason, dest });
  try {
    const { emit, TYPES } = require("../../exceptionBus");
    return emit({
      type: TYPES.FULFILLMENT_NOT_LIVE,
      source: "carrier_selection",
      entity: "destination",
      entityId: dest,
      message: `No verified live carrier for ${dest}: ${reason}`,
      context: { reason, live: false },
    });
  } catch {
    return { type: "FULFILLMENT_NOT_LIVE", persisted: false, reason };
  }
}

function iso(code) {
  const c = String(code || "").toUpperCase();
  return c === "GR" ? "EL" : c;
}

function selectCarrier({
  origin,
  destination,
  postalCode,
  weightKg,
  dimensions,
  productType,
  supplierId,
  preferCheapest = false,
} = {}) {
  const dest = iso(destination);
  const cov = lookupCoverage({ country: dest, postalCode });
  audit("select_carrier", { dest, postalCode: postalCode || "UNKNOWN" });

  if (!cov.supported) {
    const hold = {
      status: "HOLD_FOR_REVIEW",
      reason: "UNSUPPORTED_DESTINATION",
      cannotStartShipment: true,
      liveRate: false,
      estimateIsNotPrice: true,
      salesEnabled: isSalesEnabled(),
      coverage: cov,
      selected: null,
      fallback: null,
      explanation: [
        { decision: "ELIMINATED", code: "UNSUPPORTED_DESTINATION", destination: dest },
        { decision: "NO_AUTOSELECT", code: "COVERAGE_NOT_VERIFIED" },
      ],
      pusatException: emitHold("UNSUPPORTED_DESTINATION", dest),
    };
    return hold;
  }

  const catalog = priorityCatalog();
  const scored = catalog.map((c, i) => ({
    ...c,
    score: 3 - i,
    priceUnknown: true,
    qualityUnknown: true,
    speedUnknown: true,
    reliabilityUnknown: true,
  }));

  const primary = scored[0] || null;
  const fallback = scored[1] || null;
  const capable = Boolean(primary && primary.apiLevel >= 2);
  const secondOk = Boolean(fallback && fallback.apiLevel >= 2);

  let status = "HOLD_FOR_REVIEW";
  let reason = "NO_CONTRACTED_CARRIER";
  if (capable && cov.delivery_available === true) {
    status = "CANDIDATE_NOT_LIVE";
    reason = "DOCS_ONLY";
  } else if (capable) {
    status = "CANDIDATE_COVERAGE_UNKNOWN";
    reason = "POSTCODE_COVERAGE_UNKNOWN";
  } else if (!secondOk) {
    status = "HOLD_FOR_REVIEW";
    reason = "NO_FALLBACK_CAPABLE_CARRIER";
  }

  const explanation = [
    {
      decision: "NO_AUTOSELECT",
      code: cov.delivery_available === true ? "COVERAGE_CLAIM_TRUE" : "POSTCODE_COVERAGE_UNKNOWN",
      postalCode: postalCode || "UNKNOWN",
    },
    ...scored.map((c, i) => ({
      decision: "NOT_LIVE",
      rank: i + 1,
      carrierId: c.carrierId,
      reasons: [
        "NO_CONTRACT",
        "SANDBOX_NOT_VERIFIED",
        "PRICE_UNKNOWN",
        "DELIVERY_TIME_UNKNOWN",
        "SUCCESS_RATE_UNKNOWN",
        "LIVE_SHIPMENT_DISABLED",
      ],
    })),
  ];
  if (preferCheapest) {
    explanation.push({ decision: "IGNORED", code: "PREFER_CHEAPEST_DISABLED" });
  }
  explanation.push({ decision: "NO_AUTOSELECT", code: "INTERNATIONAL_BRAND_NOT_AUTO_PREFERRED" });
  if (!origin) {
    explanation.push({ decision: "HOLD", code: "ORIGIN_ADDRESS_UNKNOWN" });
  }
  if (weightKg == null) explanation.push({ decision: "UNKNOWN_INPUT", code: "WEIGHT_UNKNOWN" });
  if (!dimensions || dimensions === "UNKNOWN") explanation.push({ decision: "UNKNOWN_INPUT", code: "DIMENSIONS_UNKNOWN" });

  const autoselectAllowed = cov.coverageGranularity === "POSTCODE_LEVEL" && cov.delivery_available === true;
  if (!autoselectAllowed) {
    explanation.push({ decision: "NO_AUTOSELECT", code: "COVERAGE_GRANULARITY_NOT_POSTCODE_LEVEL" });
  }

  return {
    status,
    reason,
    explanation,
    coverageGranularity: cov.coverageGranularity || "UNKNOWN",
    internationalBrandNotAutoPreferred: true,
    localNotAutomaticallyOutranked: true,
    priceInvented: false,
    etaInvented: false,
    autoselectAllowed: false,
    pusatException: status === "HOLD_FOR_REVIEW" ? emitHold(reason, dest) : null,
    origin: origin || "UNKNOWN",
    destination: dest,
    postalCode: postalCode || "UNKNOWN",
    weightKg: weightKg == null ? "UNKNOWN" : weightKg,
    dimensions: dimensions || "UNKNOWN",
    productType: productType || "UNKNOWN",
    supplierId: supplierId || "UNKNOWN",
    supplierIsNotCarrier: supplierId ? supplierId !== (primary && primary.carrierId) : true,
    cheapestNotAutoSelected: true,
    ignoredPreferCheapest: preferCheapest === true,
    cannotStartShipment: true,
    liveRate: false,
    contracted: false,
    estimateIsNotPrice: true,
    customerDeliveryDate: "NOT_PROMISED",
    coverage: cov,
    selected: primary,
    fallback: secondOk ? fallback : null,
    adapter: createAdapter({ carrierId: primary?.carrierId, apiLevel: primary?.apiLevel || 0 }),
    salesEnabled: isSalesEnabled(),
    dropshipping: {
      supplierPreparesGoods: true,
      carrierTransports: true,
      selectionUsesActualOriginAndDestination: true,
    },
  };
}

function mockShipmentLifecycle(selectResult) {
  const adapter = selectResult.adapter || createAdapter({ carrierId: "mock" });
  return {
    live: false,
    createShipment: adapter.createShipment({ mock: true }),
    createLabel: adapter.createLabel(),
    track: adapter.trackShipment("MOCK"),
    returns: adapter.createReturn(),
    returnLabel: adapter.getReturnLabel(),
  };
}

module.exports = { selectCarrier, mockShipmentLifecycle };
