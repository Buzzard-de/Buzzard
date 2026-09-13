import { randomUUID } from "crypto";
import { isSupplierOrderNetworkEnabled } from "@/lib/supplier-engine/network";
import { listFulfillmentOperationalViews, getFulfillmentOperationalView } from "./aggregator";
import { runFulfillmentChecks } from "./checks";
import { aggregateOverallLevel } from "./matrix";
import { upsertIncidentFromFinding, resolveOpenIncidentsForFulfillment } from "./incidents";
import { recordReconciliationRun, saveOperationalSnapshot } from "./persistence";
import { recordControlTowerAudit } from "./audit";
import { emitControlTowerAnalytics } from "./analytics";
import type {
  FulfillmentControlTowerFilter,
  FulfillmentOperationalView,
  FulfillmentReconciliationResult,
  ReconciliationRunRecord,
} from "./types";

export interface ReconciliationRunOptions {
  filter?: FulfillmentControlTowerFilter;
  correlationId?: string;
  fulfillmentIds?: string[];
}

export function runFulfillmentReconciliation(
  options: ReconciliationRunOptions = {}
): ReconciliationRunRecord {
  if (isSupplierOrderNetworkEnabled()) {
    throw new Error("NETWORK_SAFETY_VIOLATION:SUPPLIER_ORDER_NETWORK_MUST_BE_DISABLED");
  }

  const started = Date.now();
  const correlationId = options.correlationId || randomUUID();
  const runId = `rec_${Date.now()}_${randomUUID().slice(0, 8)}`;

  let views = listFulfillmentOperationalViews(options.filter);
  if (options.fulfillmentIds?.length) {
    views = views.filter((v) => options.fulfillmentIds!.includes(v.fulfillmentId));
  }

  let passed = 0;
  let warnings = 0;
  let mismatches = 0;
  let critical = 0;
  let incidentsCreated = 0;
  let incidentsResolved = 0;
  const errors: string[] = [];

  for (const view of views) {
    try {
      const result = reconcileSingleFulfillment(view.fulfillmentId, correlationId);
      saveOperationalSnapshot({ ...result.fulfillment, lastReconciledAt: new Date().toISOString() });
      switch (result.overallLevel) {
        case "PASS":
          passed++;
          break;
        case "WARNING":
          warnings++;
          break;
        case "MISMATCH":
          mismatches++;
          break;
        case "CRITICAL":
          critical++;
          break;
      }
      incidentsCreated += result.incidentsCreated ?? 0;
      incidentsResolved += resolveOpenIncidentsForFulfillment(
        view.fulfillmentId,
        new Set(result.incidentFingerprints)
      );
    } catch (err) {
      errors.push(`${view.fulfillmentId}:${err instanceof Error ? err.message : "UNKNOWN"}`);
    }
  }

  const completedAt = new Date().toISOString();
  const record: ReconciliationRunRecord = {
    runId,
    correlationId,
    startedAt: new Date(started).toISOString(),
    completedAt,
    checkedFulfillments: views.length,
    passed,
    warnings,
    mismatches,
    critical,
    incidentsCreated,
    incidentsResolved,
    durationMs: Date.now() - started,
    errors,
  };

  recordReconciliationRun(record);
  recordControlTowerAudit({
    action: "reconciliation.completed",
    correlationId,
    metadata: {
      runId,
      checkedFulfillments: record.checkedFulfillments,
      passed,
      warnings,
      mismatches,
      critical,
      durationMs: record.durationMs,
    },
  });
  emitControlTowerAnalytics(record);

  return record;
}

export function reconcileSingleFulfillment(
  fulfillmentId: string,
  correlationId?: string
): FulfillmentReconciliationResult & { fulfillment: NonNullable<ReturnType<typeof getFulfillmentOperationalView>> } {
  const view = getFulfillmentOperationalView(fulfillmentId);
  if (!view) {
    throw new Error("FULFILLMENT_NOT_FOUND");
  }

  const findings = runFulfillmentChecks(view);
  const overallLevel = aggregateOverallLevel(findings);
  const operationalStatus: FulfillmentOperationalView["operationalStatus"] =
    overallLevel === "PASS"
      ? "HEALTHY"
      : overallLevel === "WARNING"
        ? "WARNING"
        : overallLevel === "MISMATCH"
          ? "MISMATCH"
          : "CRITICAL";

  const incidentFingerprints: string[] = [];
  let incidentsCreated = 0;
  for (const finding of findings) {
    const { created, incident } = upsertIncidentFromFinding({
      fulfillmentId,
      orderId: view.orderId,
      supplierId: view.supplierId,
      finding,
      correlationId,
    });
    if (incident && incident.status !== "RESOLVED") incidentFingerprints.push(incident.fingerprint);
    if (created) incidentsCreated++;
  }

  const fulfillment = {
    ...view,
    operationalStatus,
    lastReconciledAt: new Date().toISOString(),
  };

  saveOperationalSnapshot(fulfillment);

  return {
    fulfillmentId,
    orderId: view.orderId,
    supplierId: view.supplierId,
    overallLevel,
    findings,
    incidentFingerprints,
    incidentsCreated,
    fulfillment,
  };
}
