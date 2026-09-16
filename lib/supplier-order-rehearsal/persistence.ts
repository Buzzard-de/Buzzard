import type { RehearsalAuditEvent, SupplierOrderGoLiveRehearsal } from "./types";

const rehearsalStore = new Map<string, SupplierOrderGoLiveRehearsal>();
const rehearsalByIdempotency = new Map<string, string>();
const auditLog: RehearsalAuditEvent[] = [];
const inflightRehearsals = new Map<string, Promise<SupplierOrderGoLiveRehearsal>>();

function getPersistentStore() {
  if (typeof process === "undefined" || process.env.BUZZARD_SUPPLIER_ORDER_REHEARSAL_PERSISTENCE === "0") {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("../../server/lib/supplier-order-rehearsal/persistentStore.js") as {
      createSupplierOrderRehearsalStore: () => RehearsalStore;
    };
    return mod.createSupplierOrderRehearsalStore();
  } catch {
    return null;
  }
}

interface RehearsalStore {
  saveRehearsal(row: Record<string, unknown>): void;
  getRehearsal(rehearsalId: string): Record<string, unknown> | undefined;
  listRehearsals(limit?: number): Record<string, unknown>[];
  saveAudit(row: Record<string, unknown>): void;
  listAudit(limit?: number): Record<string, unknown>[];
}

export function saveRehearsalRecord(record: SupplierOrderGoLiveRehearsal): void {
  rehearsalStore.set(record.rehearsalId, record);
  rehearsalByIdempotency.set(record.idempotencyKey, record.rehearsalId);
  getPersistentStore()?.saveRehearsal({
    rehearsal_id: record.rehearsalId,
    order_id: record.orderId,
    supplier_id: record.supplierId,
    market: record.market,
    channel: record.channel,
    overall_status: record.overallStatus,
    current_stage: record.currentStage,
    idempotency_key: record.idempotencyKey,
    correlation_id: record.correlationId,
    record_json: JSON.stringify(record),
    updated_at: new Date().toISOString(),
  });
}

export function getRehearsalRecord(rehearsalId: string): SupplierOrderGoLiveRehearsal | undefined {
  return rehearsalStore.get(rehearsalId);
}

export function getRehearsalByIdempotency(idempotencyKey: string): SupplierOrderGoLiveRehearsal | undefined {
  const id = rehearsalByIdempotency.get(idempotencyKey);
  return id ? rehearsalStore.get(id) : undefined;
}

export function listRehearsalRecords(): SupplierOrderGoLiveRehearsal[] {
  return [...rehearsalStore.values()];
}

export function appendRehearsalAuditEvent(event: RehearsalAuditEvent): void {
  auditLog.push(event);
  getPersistentStore()?.saveAudit({
    event_id: event.eventId,
    event_type: event.type,
    rehearsal_id: event.rehearsalId,
    order_id: event.orderId,
    supplier_id: event.supplierId,
    correlation_id: event.correlationId,
    timestamp: event.timestamp,
    detail_json: JSON.stringify(event.detail || {}),
  });
}

export function listRehearsalAuditEvents(filter?: { rehearsalId?: string; type?: string }): RehearsalAuditEvent[] {
  return auditLog.filter((e) => {
    if (filter?.rehearsalId && e.rehearsalId !== filter.rehearsalId) return false;
    if (filter?.type && e.type !== filter.type) return false;
    return true;
  });
}

export function hydrateRehearsalFromPersistence(): void {
  const store = getPersistentStore();
  if (!store) return;
  for (const row of store.listRehearsals(5000)) {
    try {
      const parsed = JSON.parse(String(row.record_json || "{}")) as SupplierOrderGoLiveRehearsal;
      if (parsed.rehearsalId) {
        rehearsalStore.set(parsed.rehearsalId, parsed);
        rehearsalByIdempotency.set(parsed.idempotencyKey, parsed.rehearsalId);
      }
    } catch {
      /* ignore */
    }
  }
}

export function getInflightRehearsal(idempotencyKey: string): Promise<SupplierOrderGoLiveRehearsal> | undefined {
  return inflightRehearsals.get(idempotencyKey);
}

export function setInflightRehearsal(idempotencyKey: string, promise: Promise<SupplierOrderGoLiveRehearsal>): void {
  inflightRehearsals.set(idempotencyKey, promise);
}

export function clearInflightRehearsal(idempotencyKey: string): void {
  inflightRehearsals.delete(idempotencyKey);
}

export function resetRehearsalForTests(): void {
  rehearsalStore.clear();
  rehearsalByIdempotency.clear();
  auditLog.splice(0, auditLog.length);
  inflightRehearsals.clear();
}
