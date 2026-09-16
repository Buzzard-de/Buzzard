import type { GoLiveAuditEvent } from "./audit";
import type { ControlledGoLiveRecord, GoLiveApproval } from "./types";

const goLiveStore = new Map<string, ControlledGoLiveRecord>();
const goLiveByIdempotency = new Map<string, string>();
const approvalStore = new Map<string, GoLiveApproval>();
const auditLog: GoLiveAuditEvent[] = [];
const activatedIds = new Set<string>();

function getPersistentStore() {
  if (typeof process === "undefined" || process.env.BUZZARD_SUPPLIER_CONTROLLED_GO_LIVE_PERSISTENCE === "0") {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("../../server/lib/supplier-controlled-go-live/persistentStore.js") as {
      createSupplierControlledGoLiveStore: () => GoLiveStore;
    };
    return mod.createSupplierControlledGoLiveStore();
  } catch {
    return null;
  }
}

interface GoLiveStore {
  saveGoLive(row: Record<string, unknown>): void;
  getGoLive(goLiveId: string): Record<string, unknown> | undefined;
  listGoLives(limit?: number): Record<string, unknown>[];
  saveAudit(row: Record<string, unknown>): void;
  listAudit(limit?: number): Record<string, unknown>[];
}

export function saveControlledGoLiveRecord(record: ControlledGoLiveRecord): void {
  goLiveStore.set(record.goLiveId, record);
  goLiveByIdempotency.set(record.idempotencyKey, record.goLiveId);
  getPersistentStore()?.saveGoLive({
    go_live_id: record.goLiveId,
    supplier_id: record.supplier,
    state: record.state,
    idempotency_key: record.idempotencyKey,
    correlation_id: record.correlationId,
    record_json: JSON.stringify(record),
    updated_at: record.updatedAt,
  });
}

export function getControlledGoLiveRecord(goLiveId: string): ControlledGoLiveRecord | undefined {
  return goLiveStore.get(goLiveId);
}

export function getControlledGoLiveByIdempotency(idempotencyKey: string): ControlledGoLiveRecord | undefined {
  const id = goLiveByIdempotency.get(idempotencyKey);
  return id ? goLiveStore.get(id) : undefined;
}

export function listControlledGoLiveRecords(): ControlledGoLiveRecord[] {
  return [...goLiveStore.values()];
}

export function getLatestControlledGoLiveForScope(scope: {
  supplierId: string;
  market: string;
  channel: string;
}): ControlledGoLiveRecord | undefined {
  return listControlledGoLiveRecords()
    .filter(
      (r) =>
        r.supplier === scope.supplierId &&
        r.scope.market === scope.market &&
        r.scope.channel === scope.channel,
    )
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];
}

export function saveGoLiveApproval(approval: GoLiveApproval): void {
  approvalStore.set(approval.approvalId, approval);
}

export function getGoLiveApproval(approvalId: string): GoLiveApproval | undefined {
  return approvalStore.get(approvalId);
}

export function markGoLiveActivated(goLiveId: string): void {
  activatedIds.add(goLiveId);
}

export function isGoLiveActivated(goLiveId: string): boolean {
  return activatedIds.has(goLiveId);
}

export function hydrateControlledGoLiveFromPersistence(): void {
  const store = getPersistentStore();
  if (!store) return;
  for (const row of store.listGoLives(5000)) {
    try {
      const parsed = JSON.parse(String(row.record_json || "{}")) as ControlledGoLiveRecord;
      if (parsed.goLiveId) {
        goLiveStore.set(parsed.goLiveId, parsed);
        goLiveByIdempotency.set(parsed.idempotencyKey, parsed.goLiveId);
        if (parsed.state === "CONTROLLED_GO_LIVE") activatedIds.add(parsed.goLiveId);
      }
    } catch {
      /* ignore */
    }
  }
}

export function resetControlledGoLiveForTests(): void {
  goLiveStore.clear();
  goLiveByIdempotency.clear();
  approvalStore.clear();
  auditLog.splice(0, auditLog.length);
  activatedIds.clear();
}
