import type { SupplierReliabilityScore } from "./types";
import { getSupplierLogs } from "./observability";

/** Placeholder reliability — no invented historical data. */
export function computeSupplierReliabilityScore(supplierId: string): SupplierReliabilityScore {
  const logs = getSupplierLogs(supplierId);
  const total = logs.length;
  const successes = logs.filter((l) => l.status === "SUCCESS").length;
  const syncSuccessRate = total > 0 ? successes / total : 0;

  return {
    score: total > 0 ? Math.round(syncSuccessRate * 100) / 100 : 0.5,
    metrics: {
      uptime: total > 0 ? syncSuccessRate : 0,
      syncSuccessRate,
      orderSuccessRate: 0,
      cancellationRate: 0,
      stockAccuracy: 0,
      deliveryPerformance: 0,
    },
    sampleSize: total,
    computedAt: new Date().toISOString(),
  };
}
