import type { ReconciliationRunRecord } from "./types";

const metrics: Array<Record<string, unknown>> = [];

export function emitControlTowerAnalytics(run: ReconciliationRunRecord): void {
  const fulfillmentSuccessRate =
    run.checkedFulfillments > 0 ? run.passed / run.checkedFulfillments : 1;
  const supplierFailureRate =
    run.checkedFulfillments > 0 ? run.critical / run.checkedFulfillments : 0;

  metrics.unshift({
    source: "FULFILLMENT_CONTROL_TOWER",
    runId: run.runId,
    correlationId: run.correlationId,
    fulfillmentSuccessRate,
    supplierFailureRate,
    reconciliationMismatchCount: run.mismatches,
    criticalIncidentCount: run.critical,
    averageFulfillmentPreparationLatencyMs: run.durationMs / Math.max(run.checkedFulfillments, 1),
    recordedAt: run.completedAt,
  });
  if (metrics.length > 200) metrics.length = 200;
}

export function getControlTowerAnalyticsMetrics(limit = 20): Array<Record<string, unknown>> {
  return metrics.slice(0, limit);
}

export function resetControlTowerAnalyticsForTests(): void {
  metrics.length = 0;
}
