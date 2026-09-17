import type { CheckLevel, ObservationMetrics } from "./types";

export function evaluatePricingQuality(metrics: ObservationMetrics): { level: CheckLevel; message: string } {
  if (metrics.ordersAttempted === 0) return { level: "NOT_AVAILABLE", message: "NO_DATA" };
  if (metrics.priceMismatchCount > 0) {
    return { level: "FAIL", message: `MISMATCHES=${metrics.priceMismatchCount}` };
  }
  return { level: "UNVERIFIED", message: "NO_MISMATCH_OBSERVED" };
}
