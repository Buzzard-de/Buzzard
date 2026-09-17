import type { CheckLevel, ObservationMetrics } from "./types";

export function evaluateReturnsQuality(metrics: ObservationMetrics): { level: CheckLevel; message: string } {
  if (metrics.returnIncidents > 0) {
    return { level: "REVIEW_REQUIRED", message: `RETURN_INCIDENTS=${metrics.returnIncidents}` };
  }
  return { level: "NOT_AVAILABLE", message: "RETURN_DATA_NOT_AVAILABLE" };
}
