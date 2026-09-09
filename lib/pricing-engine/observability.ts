import type { PricingAuditEntry, PricingInput, PricingResult } from "./types";

const auditLog: PricingAuditEntry[] = [];
const MAX_AUDIT_ENTRIES = 500;

export function recordPricingAudit(
  input: PricingInput,
  result: PricingResult,
  durationMs: number
): PricingAuditEntry {
  const entry: PricingAuditEntry = {
    productId: input.productId,
    supplierId: input.supplierId,
    supplierOfferId: result.supplierOfferId,
    marketId: input.marketId,
    channel: input.channel,
    durationMs,
    pricingStatus: result.pricingStatus,
    calculatedPrice: result.customerGrossPrice,
    margin: result.buzzardContributionMargin,
    timestamp: result.calculatedAt,
  };
  auditLog.push(entry);
  if (auditLog.length > MAX_AUDIT_ENTRIES) auditLog.shift();
  return entry;
}

export function getPricingAuditLog(limit = 50): PricingAuditEntry[] {
  return auditLog.slice(-limit);
}

export function clearPricingAuditLog(): void {
  auditLog.length = 0;
}

export interface PricingMetrics {
  syncDurationMs: number;
  productsCalculated: number;
  productsValid: number;
  productsFailed: number;
  stockUpdates: number;
  priceUpdates: number;
  apiErrors: number;
}

const metrics: PricingMetrics = {
  syncDurationMs: 0,
  productsCalculated: 0,
  productsValid: 0,
  productsFailed: 0,
  stockUpdates: 0,
  priceUpdates: 0,
  apiErrors: 0,
};

export function incrementPricingMetric(key: keyof PricingMetrics, delta = 1): void {
  metrics[key] += delta;
}

export function getPricingMetrics(): PricingMetrics {
  return { ...metrics };
}

export function resetPricingMetrics(): void {
  for (const key of Object.keys(metrics) as Array<keyof PricingMetrics>) {
    metrics[key] = 0;
  }
}
