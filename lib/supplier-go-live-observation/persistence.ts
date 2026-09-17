import type { ObservationAuditEvent } from "./audit";
import type { BroaderRolloutRecord, ObservationRecord, RolloutApproval } from "./types";

const observationStore = new Map<string, ObservationRecord>();
const observationByIdempotency = new Map<string, string>();
const rolloutStore = new Map<string, BroaderRolloutRecord>();
const rolloutByIdempotency = new Map<string, string>();
const approvalStore = new Map<string, RolloutApproval>();
const activatedRolloutIds = new Set<string>();

function getPersistentStore() {
  if (typeof process === "undefined" || process.env.BUZZARD_SUPPLIER_GO_LIVE_OBSERVATION_PERSISTENCE === "0") {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("../../server/lib/supplier-go-live-observation/persistentStore.js") as {
      createSupplierGoLiveObservationStore: () => ObservationStore;
    };
    return mod.createSupplierGoLiveObservationStore();
  } catch {
    return null;
  }
}

interface ObservationStore {
  saveObservation(row: Record<string, unknown>): void;
  getObservation(observationId: string): Record<string, unknown> | undefined;
  listObservations(limit?: number): Record<string, unknown>[];
  saveRollout(row: Record<string, unknown>): void;
  getRollout(rolloutId: string): Record<string, unknown> | undefined;
  listRollouts(limit?: number): Record<string, unknown>[];
  saveAudit(row: Record<string, unknown>): void;
}

export function saveObservationRecord(record: ObservationRecord): void {
  observationStore.set(record.observationId, record);
  observationByIdempotency.set(record.idempotencyKey, record.observationId);
  getPersistentStore()?.saveObservation({
    observation_id: record.observationId,
    supplier_id: record.supplier,
    state: record.state,
    go_live_id: record.goLiveId,
    idempotency_key: record.idempotencyKey,
    correlation_id: record.correlationId,
    record_json: JSON.stringify(record),
    updated_at: record.updatedAt,
  });
}

export function getObservationRecord(observationId: string): ObservationRecord | undefined {
  return observationStore.get(observationId);
}

export function getObservationByIdempotency(idempotencyKey: string): ObservationRecord | undefined {
  const id = observationByIdempotency.get(idempotencyKey);
  return id ? observationStore.get(id) : undefined;
}

export function listObservationRecords(): ObservationRecord[] {
  return [...observationStore.values()];
}

export function getLatestObservationForScope(scope: {
  supplierId: string;
  market: string;
  channel: string;
}): ObservationRecord | undefined {
  return listObservationRecords()
    .filter(
      (r) =>
        r.supplier === scope.supplierId &&
        r.scope.market === scope.market &&
        r.scope.channel === scope.channel,
    )
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];
}

export function saveBroaderRolloutRecord(record: BroaderRolloutRecord): void {
  rolloutStore.set(record.rolloutId, record);
  rolloutByIdempotency.set(record.idempotencyKey, record.rolloutId);
  getPersistentStore()?.saveRollout({
    rollout_id: record.rolloutId,
    observation_id: record.observationId,
    supplier_id: record.supplier,
    state: record.state,
    idempotency_key: record.idempotencyKey,
    correlation_id: record.correlationId,
    record_json: JSON.stringify(record),
    updated_at: record.updatedAt,
  });
}

export function getBroaderRolloutRecord(rolloutId: string): BroaderRolloutRecord | undefined {
  return rolloutStore.get(rolloutId);
}

export function getBroaderRolloutByIdempotency(idempotencyKey: string): BroaderRolloutRecord | undefined {
  const id = rolloutByIdempotency.get(idempotencyKey);
  return id ? rolloutStore.get(id) : undefined;
}

export function listBroaderRolloutRecords(): BroaderRolloutRecord[] {
  return [...rolloutStore.values()];
}

export function getLatestBroaderRolloutForScope(scope: {
  supplierId: string;
  market: string;
  channel: string;
}): BroaderRolloutRecord | undefined {
  return listBroaderRolloutRecords()
    .filter(
      (r) =>
        r.supplier === scope.supplierId &&
        r.scope.market === scope.market &&
        r.scope.channel === scope.channel,
    )
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];
}

export function saveRolloutApproval(approval: RolloutApproval): void {
  approvalStore.set(approval.approvalId, approval);
}

export function getRolloutApproval(approvalId: string): RolloutApproval | undefined {
  return approvalStore.get(approvalId);
}

export function markRolloutActivated(rolloutId: string): void {
  activatedRolloutIds.add(rolloutId);
}

export function isRolloutActivated(rolloutId: string): boolean {
  return activatedRolloutIds.has(rolloutId);
}

export function hydrateObservationFromPersistence(): void {
  const store = getPersistentStore();
  if (!store) return;
  for (const row of store.listObservations(5000)) {
    try {
      const parsed = JSON.parse(String(row.record_json || "{}")) as ObservationRecord;
      if (parsed.observationId) {
        observationStore.set(parsed.observationId, parsed);
        observationByIdempotency.set(parsed.idempotencyKey, parsed.observationId);
      }
    } catch {
      /* ignore */
    }
  }
  for (const row of store.listRollouts(5000)) {
    try {
      const parsed = JSON.parse(String(row.record_json || "{}")) as BroaderRolloutRecord;
      if (parsed.rolloutId) {
        rolloutStore.set(parsed.rolloutId, parsed);
        rolloutByIdempotency.set(parsed.idempotencyKey, parsed.rolloutId);
        if (parsed.state === "BROADER_ROLLOUT_ACTIVE") activatedRolloutIds.add(parsed.rolloutId);
      }
    } catch {
      /* ignore */
    }
  }
}

export function resetObservationForTests(): void {
  observationStore.clear();
  observationByIdempotency.clear();
  rolloutStore.clear();
  rolloutByIdempotency.clear();
  approvalStore.clear();
  activatedRolloutIds.clear();
}
