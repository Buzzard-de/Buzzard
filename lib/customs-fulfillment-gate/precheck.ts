import type { TradeRouteClassification } from "@/lib/trade-route-fulfillment/types";
import { loadProductCustomsSnapshot } from "./productCustoms";
import type { CustomsDecision, CustomsLineAssessment, CustomsPrecheckResult } from "./types";

const completedCache = new Map<string, CustomsPrecheckResult>();

function cacheKey(orderId: string, idempotencyKey: string): string {
  return `${orderId}:${idempotencyKey}:customs-precheck`;
}

function assessLine(input: {
  productId: string;
  quantity: number;
  lineGross: number;
  productName: string;
}): CustomsLineAssessment {
  const snapshot = loadProductCustomsSnapshot(input.productId, input.lineGross, input.productName);
  const missingFields: string[] = [];

  if (!snapshot.hsCode) missingFields.push("hsCode");
  if (!snapshot.originCountry) missingFields.push("originCountry");
  if (snapshot.customsValue == null || snapshot.customsValue <= 0) missingFields.push("customsValue");
  if (!snapshot.commodityDescription) missingFields.push("commodityDescription");

  return {
    productId: input.productId,
    hsCode: snapshot.hsCode,
    originCountry: snapshot.originCountry,
    customsValue: snapshot.customsValue,
    commodityDescription: snapshot.commodityDescription,
    restrictedGoods: snapshot.restrictedGoods,
    documentationRequired: snapshot.documentationRequired,
    missingFields,
  };
}

function decideFromLines(
  tradeRoute: TradeRouteClassification,
  lines: CustomsLineAssessment[],
): CustomsPrecheckResult {
  if (tradeRoute.tradeRoute === "SAME_COUNTRY" || tradeRoute.tradeRoute === "EU_TO_EU") {
    return {
      ok: true,
      decision: "CUSTOMS_NOT_REQUIRED",
      missingFields: [],
      lineAssessments: lines,
      exportRequired: false,
      importRequired: false,
      hold: false,
    };
  }

  if (tradeRoute.tradeRoute === "UNKNOWN") {
    return {
      ok: false,
      decision: "CUSTOMS_BLOCKED",
      reason: "TRADE_ROUTE_UNKNOWN",
      missingFields: ["tradeRoute"],
      lineAssessments: lines,
      exportRequired: true,
      importRequired: true,
      hold: true,
    };
  }

  const blocked = lines.some((l) => l.restrictedGoods);
  if (blocked) {
    return {
      ok: false,
      decision: "CUSTOMS_BLOCKED",
      reason: "RESTRICTED_GOODS",
      missingFields: [],
      lineAssessments: lines,
      exportRequired: tradeRoute.flags.requiresExportProcess,
      importRequired: tradeRoute.flags.requiresImportProcess,
      hold: true,
    };
  }

  const allMissing = [...new Set(lines.flatMap((l) => l.missingFields))];
  if (allMissing.length === 0) {
    const dutyEstimate = lines.reduce((sum, l) => sum + (l.customsValue ?? 0) * 0.05, 0);
    const taxEstimate = lines.reduce((sum, l) => sum + (l.customsValue ?? 0) * 0.19, 0);
    return {
      ok: true,
      decision: "CUSTOMS_READY",
      missingFields: [],
      lineAssessments: lines,
      dutyEstimate: Math.round(dutyEstimate * 100) / 100,
      taxEstimate: Math.round(taxEstimate * 100) / 100,
      exportRequired: tradeRoute.flags.requiresExportProcess,
      importRequired: tradeRoute.flags.requiresImportProcess,
      hold: false,
    };
  }

  return {
    ok: false,
    decision: "CUSTOMS_REVIEW_REQUIRED",
    reason: "MISSING_CUSTOMS_DATA",
    missingFields: allMissing,
    lineAssessments: lines,
    exportRequired: tradeRoute.flags.requiresExportProcess,
    importRequired: tradeRoute.flags.requiresImportProcess,
    hold: true,
  };
}

/**
 * Orchestrates customs assessment using existing product customs data.
 * Does not invent HS codes, origins, or values.
 */
export function runCustomsPrecheck(input: {
  orderId: string;
  idempotencyKey: string;
  tradeRoute: TradeRouteClassification;
  supplierOrigin: string;
  items: Array<{
    productId: string;
    quantity: number;
    lineGross: number;
    productName: string;
  }>;
}): CustomsPrecheckResult {
  const key = cacheKey(input.orderId, input.idempotencyKey);
  const cached = completedCache.get(key);
  if (cached) return cached;

  const lines = input.items.map((item) => assessLine(item));
  const result = decideFromLines(input.tradeRoute, lines);
  completedCache.set(key, result);
  return result;
}

/** Test-only reset */
export function clearCustomsPrecheckCache(): void {
  completedCache.clear();
}
