import { isSupplierOrderNetworkEnabled } from "@/lib/supplier-engine/network";
import type { ProductionValidationSafetyCounters } from "./types";

const counters: ProductionValidationSafetyCounters = {
  realHealthCalls: 0,
  realCatalogCalls: 0,
  realStockCalls: 0,
  realPriceCalls: 0,
  realOrderCalls: 0,
  realCancelCalls: 0,
  realReturnCalls: 0,
  realRefundCalls: 0,
  realTrackingCalls: 0,
  realCustomerShipments: 0,
  realPaymentCaptures: 0,
  realMarketplaceSubmissions: 0,
  realCarrierCalls: 0,
};

export function getProductionValidationSafetyCounters(): ProductionValidationSafetyCounters {
  return { ...counters };
}

export function resetProductionValidationSafetyCountersForTests(): void {
  for (const key of Object.keys(counters) as Array<keyof ProductionValidationSafetyCounters>) {
    counters[key] = 0;
  }
}

export function assertProductionValidationNetworkSafety(): void {
  if (isSupplierOrderNetworkEnabled()) {
    counters.realOrderCalls++;
    throw new Error("VALIDATION_FAIL:SUPPLIER_ORDER_NETWORK_MUST_BE_DISABLED");
  }
}

export function recordReadCall(kind: "health" | "catalog" | "stock" | "price"): void {
  if (kind === "health") counters.realHealthCalls++;
  if (kind === "catalog") counters.realCatalogCalls++;
  if (kind === "stock") counters.realStockCalls++;
  if (kind === "price") counters.realPriceCalls++;
}

/** Audit-only — blocked attempts never increment real order call counters. */
export function recordBlockedOrderAttempt(): void {
  /* intentional no-op: pre-network hard block */
}

export function recordBlockedCancelAttempt(): void {
  counters.realCancelCalls++;
}

export function recordBlockedReturnAttempt(): void {
  counters.realReturnCalls++;
}

export function recordBlockedRefundAttempt(): void {
  counters.realRefundCalls++;
}

export function recordBlockedTrackingAttempt(): void {
  counters.realTrackingCalls++;
}

export function assertProductionValidationSafetyInvariants(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  if (counters.realOrderCalls !== 0) violations.push(`realOrderCalls=${counters.realOrderCalls}`);
  if (counters.realCancelCalls !== 0) violations.push(`realCancelCalls=${counters.realCancelCalls}`);
  if (counters.realReturnCalls !== 0) violations.push(`realReturnCalls=${counters.realReturnCalls}`);
  if (counters.realRefundCalls !== 0) violations.push(`realRefundCalls=${counters.realRefundCalls}`);
  if (counters.realCustomerShipments !== 0) violations.push(`realCustomerShipments=${counters.realCustomerShipments}`);
  if (counters.realPaymentCaptures !== 0) violations.push(`realPaymentCaptures=${counters.realPaymentCaptures}`);
  if (counters.realMarketplaceSubmissions !== 0) {
    violations.push(`realMarketplaceSubmissions=${counters.realMarketplaceSubmissions}`);
  }
  if (counters.realCarrierCalls !== 0) violations.push(`realCarrierCalls=${counters.realCarrierCalls}`);
  if (isSupplierOrderNetworkEnabled()) violations.push("SUPPLIER_ORDER_NETWORK_ENABLED");
  return { ok: violations.length === 0, violations };
}
