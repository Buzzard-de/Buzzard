import type { ObservationMetrics, ObservationThresholds } from "./types";

export function evaluateThresholds(
  metrics: ObservationMetrics,
  thresholds: ObservationThresholds,
): { passed: boolean; blockers: string[]; breaches: string[] } {
  const blockers: string[] = [];
  const breaches: string[] = [];

  if (!thresholds.configured) {
    blockers.push("THRESHOLD_NOT_CONFIGURED");
    return { passed: false, blockers, breaches };
  }

  if (
    thresholds.maxSupplierErrorRate !== undefined &&
    metrics.supplierErrorRate > thresholds.maxSupplierErrorRate
  ) {
    breaches.push("SUPPLIER_ERROR_RATE");
    blockers.push("THRESHOLD_BREACH:SUPPLIER_ERROR_RATE");
  }

  if (
    thresholds.maxUnknownOutcomeRate !== undefined &&
    metrics.unknownOutcomes / Math.max(metrics.ordersAttempted, 1) > thresholds.maxUnknownOutcomeRate
  ) {
    breaches.push("UNKNOWN_OUTCOME_RATE");
    blockers.push("THRESHOLD_BREACH:UNKNOWN_OUTCOME_RATE");
  }

  if (
    thresholds.maxInventoryMismatch !== undefined &&
    metrics.inventoryMismatchCount > thresholds.maxInventoryMismatch
  ) {
    breaches.push("INVENTORY_MISMATCH");
    blockers.push("THRESHOLD_BREACH:INVENTORY_MISMATCH");
  }

  if (thresholds.maxPriceMismatch !== undefined && metrics.priceMismatchCount > thresholds.maxPriceMismatch) {
    breaches.push("PRICE_MISMATCH");
    blockers.push("THRESHOLD_BREACH:PRICE_MISMATCH");
  }

  if (
    thresholds.maxFinancialMismatch !== undefined &&
    metrics.financialReconciliationFailures > thresholds.maxFinancialMismatch
  ) {
    breaches.push("FINANCIAL_MISMATCH");
    blockers.push("THRESHOLD_BREACH:FINANCIAL_MISMATCH");
  }

  if (
    thresholds.maxCriticalIncidents !== undefined &&
    metrics.criticalIncidents > thresholds.maxCriticalIncidents
  ) {
    breaches.push("CRITICAL_INCIDENTS");
    blockers.push("THRESHOLD_BREACH:CRITICAL_INCIDENTS");
  }

  return { passed: blockers.length === 0, blockers, breaches };
}
