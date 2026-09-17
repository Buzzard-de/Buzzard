import type { CheckLevel, ObservationMetrics } from "./types";

export function evaluateFinancialQuality(metrics: ObservationMetrics): { level: CheckLevel; message: string } {
  if (metrics.ordersAttempted === 0) return { level: "NOT_AVAILABLE", message: "NO_DATA" };
  if (metrics.financialReconciliationFailures > 0) {
    return { level: "REVIEW_REQUIRED", message: `FAILURES=${metrics.financialReconciliationFailures}` };
  }
  return { level: "UNVERIFIED", message: "NO_RECONCILIATION_DATA" };
}
