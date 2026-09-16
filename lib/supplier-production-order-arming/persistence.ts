import type { ArmingAuditEvent } from "./audit";
import type { ProductionArmingApproval, ProductionOrderArmingRecord } from "./types";

const armingStore = new Map<string, ProductionOrderArmingRecord>();
const armingByIdempotency = new Map<string, string>();
const approvalStore = new Map<string, ProductionArmingApproval>();
const auditLog: ArmingAuditEvent[] = [];
const inflight = new Map<string, Promise<ProductionOrderArmingRecord>>();

function getPersistentStore() {
  if (typeof process === "undefined" || process.env.BUZZARD_SUPPLIER_PRODUCTION_ORDER_ARMING_PERSISTENCE === "0") {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("../../server/lib/supplier-production-order-arming/persistentStore.js") as {
      createSupplierProductionOrderArmingStore: () => ArmingStore;
    };
    return mod.createSupplierProductionOrderArmingStore();
  } catch {
    return null;
  }
}

interface ArmingStore {
  saveArming(row: Record<string, unknown>): void;
  getArming(armingId: string): Record<string, unknown> | undefined;
  listArmings(limit?: number): Record<string, unknown>[];
  saveAudit(row: Record<string, unknown>): void;
  listAudit(limit?: number): Record<string, unknown>[];
}

export function saveArmingRecord(record: ProductionOrderArmingRecord): void {
  armingStore.set(record.armingId, record);
  armingByIdempotency.set(record.idempotencyKey, record.armingId);
  getPersistentStore()?.saveArming({
    arming_id: record.armingId,
    supplier_id: record.supplier,
    market: record.scope.market,
    channel: record.scope.channel,
    environment: record.scope.environment,
    status: record.status,
    idempotency_key: record.idempotencyKey,
    correlation_id: record.correlationId,
    record_json: JSON.stringify(record),
    updated_at: record.updatedAt,
  });
}

export function getArmingRecord(armingId: string): ProductionOrderArmingRecord | undefined {
  return armingStore.get(armingId);
}

export function getArmingByIdempotency(idempotencyKey: string): ProductionOrderArmingRecord | undefined {
  const id = armingByIdempotency.get(idempotencyKey);
  return id ? armingStore.get(id) : undefined;
}

export function listArmingRecords(): ProductionOrderArmingRecord[] {
  return [...armingStore.values()];
}

export function getLatestArmingForScope(scope: {
  supplierId: string;
  market: string;
  channel: string;
  environment: string;
}): ProductionOrderArmingRecord | undefined {
  return listArmingRecords()
    .filter(
      (r) =>
        r.supplier === scope.supplierId &&
        r.scope.market === scope.market &&
        r.scope.channel === scope.channel &&
        r.scope.environment === scope.environment,
    )
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];
}

export function saveArmingApproval(approval: ProductionArmingApproval): void {
  approvalStore.set(approval.approvalId, approval);
}

export function getArmingApproval(approvalId: string): ProductionArmingApproval | undefined {
  return approvalStore.get(approvalId);
}

export function getArmingApprovalForArming(armingId: string): ProductionArmingApproval | undefined {
  return [...approvalStore.values()].find((a) => a.armingId === armingId && a.status === "APPROVED");
}

export function appendArmingAuditEvent(event: ArmingAuditEvent): void {
  auditLog.push(event);
  getPersistentStore()?.saveAudit({
    event_id: event.eventId,
    event_type: event.type,
    arming_id: event.armingId,
    supplier_id: event.supplierId,
    correlation_id: event.correlationId,
    timestamp: event.timestamp,
    detail_json: JSON.stringify(event.detail || {}),
  });
}

export function listArmingAuditEvents(filter?: { armingId?: string; type?: string }): ArmingAuditEvent[] {
  return auditLog.filter((e) => {
    if (filter?.armingId && e.armingId !== filter.armingId) return false;
    if (filter?.type && e.type !== filter.type) return false;
    return true;
  });
}

export function hydrateArmingFromPersistence(): void {
  const store = getPersistentStore();
  if (!store) return;
  for (const row of store.listArmings(5000)) {
    try {
      const parsed = JSON.parse(String(row.record_json || "{}")) as ProductionOrderArmingRecord;
      if (parsed.armingId) {
        armingStore.set(parsed.armingId, parsed);
        armingByIdempotency.set(parsed.idempotencyKey, parsed.armingId);
      }
    } catch {
      /* ignore */
    }
  }
}

export function getInflightArming(key: string): Promise<ProductionOrderArmingRecord> | undefined {
  return inflight.get(key);
}

export function setInflightArming(key: string, promise: Promise<ProductionOrderArmingRecord>): void {
  inflight.set(key, promise);
}

export function clearInflightArming(key: string): void {
  inflight.delete(key);
}

export function resetArmingForTests(): void {
  armingStore.clear();
  armingByIdempotency.clear();
  approvalStore.clear();
  auditLog.splice(0, auditLog.length);
  inflight.clear();
}
