import type { SupplierReliabilityScore } from "./types";
import { getSupplierLogs } from "./observability";
import { getSupplierHealth } from "./health";

/** Deterministic reliability from persisted health + in-memory logs. */
export function computeSupplierReliabilityScore(supplierId: string): SupplierReliabilityScore {
  const health = getSupplierHealth(supplierId);
  const logs = getSupplierLogs(supplierId);
  const total = health.successCount + health.errorCount + logs.length;
  const successes = health.successCount + logs.filter((l) => l.status === "SUCCESS").length;
  const syncSuccessRate = total > 0 ? successes / total : health.reliabilityScore;

  return {
    score: total > 0 ? Math.round(syncSuccessRate * 100) / 100 : health.reliabilityScore || 0.5,
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
