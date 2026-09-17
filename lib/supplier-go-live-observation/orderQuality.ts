import type { CheckLevel, ObservationMetrics } from "./types";

export function evaluateOrderQuality(metrics: ObservationMetrics): { level: CheckLevel; message: string } {
  if (metrics.ordersAttempted === 0) {
    return { level: "UNVERIFIED", message: "NO_ORDERS_OBSERVED" };
  }
  if (metrics.duplicateAttempts > 0 || metrics.idempotencyViolations > 0) {
    return { level: "FAIL", message: "CRITICAL:DUPLICATE_OR_IDEMPOTENCY_VIOLATION" };
  }
  if (metrics.unknownOutcomes > 0) {
    return { level: "REVIEW_REQUIRED", message: `UNKNOWN_OUTCOMES=${metrics.unknownOutcomes}` };
  }
  const rate = metrics.ordersAccepted / metrics.ordersAttempted;
  if (rate >= 0.95) return { level: "PASS", message: `success=${(rate * 100).toFixed(1)}%` };
  if (rate >= 0.8) return { level: "REVIEW_REQUIRED", message: `success=${(rate * 100).toFixed(1)}%` };
  return { level: "FAIL", message: `success=${(rate * 100).toFixed(1)}%` };
}
