import type {
  FulfillmentIncident,
  FulfillmentOperationalView,
  ReconciliationRunRecord,
} from "./types";

const snapshotStore = new Map<string, FulfillmentOperationalView>();
const incidentStore = new Map<string, FulfillmentIncident>();
const incidentByFingerprint = new Map<string, string>();
const reconciliationRuns: ReconciliationRunRecord[] = [];

function getPersistentStore() {
  if (typeof process === "undefined" || process.env.BUZZARD_FULFILLMENT_TOWER_PERSISTENCE === "0") {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("../../server/lib/fulfillment/persistentStore.js") as {
      createFulfillmentControlTowerStore: () => FulfillmentTowerStore;
    };
    return mod.createFulfillmentControlTowerStore();
  } catch {
    return null;
  }
}

interface FulfillmentTowerStore {
  saveSnapshot(row: Record<string, unknown>): void;
  getSnapshot(fulfillmentId: string): Record<string, unknown> | undefined;
  listSnapshots(): Record<string, unknown>[];
  saveIncident(row: Record<string, unknown>): void;
  getIncidentByFingerprint(fingerprint: string): Record<string, unknown> | undefined;
  listIncidents(): Record<string, unknown>[];
  saveReconciliationRun(row: Record<string, unknown>): void;
  listReconciliationRuns(limit?: number): Record<string, unknown>[];
  resetAll(): void;
}

function rowToSnapshot(row: Record<string, unknown>): FulfillmentOperationalView {
  return JSON.parse(String(row.view_json || "{}")) as FulfillmentOperationalView;
}

function rowToIncident(row: Record<string, unknown>): FulfillmentIncident {
  return {
    incidentId: String(row.incident_id),
    fingerprint: String(row.fingerprint),
    fulfillmentId: String(row.fulfillment_id),
    orderId: String(row.order_id),
    supplierId: String(row.supplier_id),
    severity: row.severity as FulfillmentIncident["severity"],
    category: row.category as FulfillmentIncident["category"],
    code: String(row.code),
    message: String(row.message),
    detectedAt: String(row.detected_at),
    resolvedAt: row.resolved_at ? String(row.resolved_at) : undefined,
    status: row.status as FulfillmentIncident["status"],
    correlationId: row.correlation_id ? String(row.correlation_id) : undefined,
    resolutionNote: row.resolution_note ? String(row.resolution_note) : undefined,
    resolutionActor: row.resolution_actor ? String(row.resolution_actor) : undefined,
    acknowledgedAt: row.acknowledged_at ? String(row.acknowledged_at) : undefined,
    acknowledgedBy: row.acknowledged_by ? String(row.acknowledged_by) : undefined,
  };
}

function rowToRun(row: Record<string, unknown>): ReconciliationRunRecord {
  return {
    runId: String(row.run_id),
    correlationId: String(row.correlation_id),
    startedAt: String(row.started_at),
    completedAt: String(row.completed_at),
    checkedFulfillments: Number(row.checked_fulfillments || 0),
    passed: Number(row.passed || 0),
    warnings: Number(row.warnings || 0),
    mismatches: Number(row.mismatches || 0),
    critical: Number(row.critical || 0),
    incidentsCreated: Number(row.incidents_created || 0),
    incidentsResolved: Number(row.incidents_resolved || 0),
    durationMs: Number(row.duration_ms || 0),
    errors: JSON.parse(String(row.errors_json || "[]")),
  };
}

export function saveOperationalSnapshot(view: FulfillmentOperationalView): void {
  snapshotStore.set(view.fulfillmentId, view);
  getPersistentStore()?.saveSnapshot({
    fulfillment_id: view.fulfillmentId,
    order_id: view.orderId,
    supplier_id: view.supplierId,
    operational_status: view.operationalStatus,
    view_json: JSON.stringify(view),
    last_reconciled_at: view.lastReconciledAt || null,
    updated_at: view.updatedAt,
  });
}

export function getOperationalSnapshot(fulfillmentId: string): FulfillmentOperationalView | undefined {
  const cached = snapshotStore.get(fulfillmentId);
  if (cached) return cached;
  const row = getPersistentStore()?.getSnapshot(fulfillmentId);
  if (!row) return undefined;
  const view = rowToSnapshot(row);
  snapshotStore.set(view.fulfillmentId, view);
  return view;
}

export function saveIncidentRecord(incident: FulfillmentIncident): void {
  incidentStore.set(incident.incidentId, incident);
  incidentByFingerprint.set(incident.fingerprint, incident.incidentId);
  getPersistentStore()?.saveIncident({
    incident_id: incident.incidentId,
    fingerprint: incident.fingerprint,
    fulfillment_id: incident.fulfillmentId,
    order_id: incident.orderId,
    supplier_id: incident.supplierId,
    severity: incident.severity,
    category: incident.category,
    code: incident.code,
    message: incident.message,
    detected_at: incident.detectedAt,
    resolved_at: incident.resolvedAt || null,
    status: incident.status,
    correlation_id: incident.correlationId || null,
    resolution_note: incident.resolutionNote || null,
    resolution_actor: incident.resolutionActor || null,
    acknowledged_at: incident.acknowledgedAt || null,
    acknowledged_by: incident.acknowledgedBy || null,
  });
}

export function updateIncidentRecord(incident: FulfillmentIncident): void {
  saveIncidentRecord(incident);
}

export function getIncidentByFingerprint(fingerprint: string): FulfillmentIncident | undefined {
  const id = incidentByFingerprint.get(fingerprint);
  if (id) return incidentStore.get(id);
  const row = getPersistentStore()?.getIncidentByFingerprint(fingerprint);
  if (!row) return undefined;
  const incident = rowToIncident(row);
  incidentStore.set(incident.incidentId, incident);
  incidentByFingerprint.set(incident.fingerprint, incident.incidentId);
  return incident;
}

export function listIncidents(): FulfillmentIncident[] {
  if (incidentStore.size) return [...incidentStore.values()];
  const rows = getPersistentStore()?.listIncidents() || [];
  for (const row of rows) {
    const incident = rowToIncident(row);
    incidentStore.set(incident.incidentId, incident);
    incidentByFingerprint.set(incident.fingerprint, incident.incidentId);
  }
  return [...incidentStore.values()];
}

export function recordReconciliationRun(run: ReconciliationRunRecord): void {
  reconciliationRuns.unshift(run);
  getPersistentStore()?.saveReconciliationRun({
    run_id: run.runId,
    correlation_id: run.correlationId,
    started_at: run.startedAt,
    completed_at: run.completedAt,
    checked_fulfillments: run.checkedFulfillments,
    passed: run.passed,
    warnings: run.warnings,
    mismatches: run.mismatches,
    critical: run.critical,
    incidents_created: run.incidentsCreated,
    incidents_resolved: run.incidentsResolved,
    duration_ms: run.durationMs,
    errors_json: JSON.stringify(run.errors),
  });
}

export function getLastReconciliationRun(): ReconciliationRunRecord | undefined {
  if (reconciliationRuns.length) return reconciliationRuns[0];
  const rows = getPersistentStore()?.listReconciliationRuns(1) || [];
  return rows[0] ? rowToRun(rows[0]) : undefined;
}

export function hydrateControlTowerFromPersistence(): void {
  const store = getPersistentStore();
  if (!store) return;
  for (const row of store.listSnapshots()) {
    const view = rowToSnapshot(row);
    snapshotStore.set(view.fulfillmentId, view);
  }
  for (const row of store.listIncidents()) {
    const incident = rowToIncident(row);
    incidentStore.set(incident.incidentId, incident);
    incidentByFingerprint.set(incident.fingerprint, incident.incidentId);
  }
  for (const row of store.listReconciliationRuns(20)) {
    reconciliationRuns.push(rowToRun(row));
  }
}

export function resetControlTowerMemoryForTests(): void {
  snapshotStore.clear();
  incidentStore.clear();
  incidentByFingerprint.clear();
  reconciliationRuns.length = 0;
}

export function resetControlTowerForTests(): void {
  resetControlTowerMemoryForTests();
  getPersistentStore()?.resetAll();
}
