import type { CheckLevel, ObservationMetrics } from "./types";

export function evaluateFulfillmentQuality(metrics: ObservationMetrics): { level: CheckLevel; message: string } {
  if (metrics.ordersAttempted === 0) return { level: "NOT_AVAILABLE", message: "NO_DATA" };
  if (metrics.fulfillmentMismatchCount > 0) {
    return { level: "FAIL", message: `MISMATCHES=${metrics.fulfillmentMismatchCount}` };
  }
  if (metrics.trackingFailures > 0) {
    return { level: "UNVERIFIED", message: `TRACKING_FAILURES=${metrics.trackingFailures}` };
  }
  return { level: "PASS", message: "NO_MISMATCH" };
}
