import type { CheckLevel, ObservationMetrics } from "./types";

export function evaluateInventoryQuality(metrics: ObservationMetrics): { level: CheckLevel; message: string } {
  if (metrics.ordersAttempted === 0) return { level: "NOT_AVAILABLE", message: "NO_DATA" };
  if (metrics.inventoryMismatchCount > 0) {
    return { level: "FAIL", message: `CRITICAL:INVENTORY_MISMATCH=${metrics.inventoryMismatchCount}` };
  }
  return { level: "PASS", message: "NO_MISMATCH" };
}
