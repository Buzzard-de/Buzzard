import { listRehearsalRecords } from "@/lib/supplier-order-rehearsal/persistence";
import type { SupplierOrderGoLiveRehearsal } from "@/lib/supplier-order-rehearsal/types";
import type { ActivationAuditEvent } from "./audit";
import type { FirstSupplierOrderGate, SupplierOrderActivationRequest } from "./types";

const activationStore = new Map<string, SupplierOrderActivationRequest>();
const activationByIdempotency = new Map<string, string>();
const firstOrderStore = new Map<string, FirstSupplierOrderGate>();
const firstOrderByIdempotency = new Map<string, string>();
const auditLog: ActivationAuditEvent[] = [];
const inflightActivations = new Map<string, Promise<SupplierOrderActivationRequest>>();

function getPersistentStore() {
  if (typeof process === "undefined" || process.env.BUZZARD_SUPPLIER_ORDER_ACTIVATION_PERSISTENCE === "0") {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("../../server/lib/supplier-order-activation/persistentStore.js") as {
      createSupplierOrderActivationStore: () => ActivationStore;
    };
    return mod.createSupplierOrderActivationStore();
  } catch {
    return null;
  }
}

interface ActivationStore {
  saveActivation(row: Record<string, unknown>): void;
  getActivation(activationId: string): Record<string, unknown> | undefined;
  listActivations(limit?: number): Record<string, unknown>[];
  saveFirstOrder(row: Record<string, unknown>): void;
  getFirstOrder(firstOrderId: string): Record<string, unknown> | undefined;
  listFirstOrders(limit?: number): Record<string, unknown>[];
  saveAudit(row: Record<string, unknown>): void;
  listAudit(limit?: number): Record<string, unknown>[];
}

export function saveActivationRecord(record: SupplierOrderActivationRequest): void {
  activationStore.set(record.activationId, record);
  activationByIdempotency.set(record.idempotencyKey, record.activationId);
  getPersistentStore()?.saveActivation({
    activation_id: record.activationId,
    supplier_id: record.supplierId,
    market: record.market,
    channel: record.channel,
    environment: record.environment,
    status: record.status,
    network_state: record.networkState,
    idempotency_key: record.idempotencyKey,
    correlation_id: record.correlationId,
    record_json: JSON.stringify(record),
    updated_at: record.updatedAt,
  });
}

export function getActivationRecord(activationId: string): SupplierOrderActivationRequest | undefined {
  return activationStore.get(activationId);
}

export function getActivationByIdempotency(idempotencyKey: string): SupplierOrderActivationRequest | undefined {
  const id = activationByIdempotency.get(idempotencyKey);
  return id ? activationStore.get(id) : undefined;
}

export function listActivationRecords(): SupplierOrderActivationRequest[] {
  return [...activationStore.values()];
}

export function saveFirstOrderGate(record: FirstSupplierOrderGate): void {
  firstOrderStore.set(record.firstOrderId, record);
  firstOrderByIdempotency.set(record.idempotencyKey, record.firstOrderId);
  getPersistentStore()?.saveFirstOrder({
    first_order_id: record.firstOrderId,
    activation_id: record.activationId,
    supplier_id: record.supplierId,
    status: record.status,
    idempotency_key: record.idempotencyKey,
    record_json: JSON.stringify(record),
    updated_at: record.createdAt,
  });
}

export function getFirstOrderGate(firstOrderId: string): FirstSupplierOrderGate | undefined {
  return firstOrderStore.get(firstOrderId);
}

export function getFirstOrderByIdempotency(idempotencyKey: string): FirstSupplierOrderGate | undefined {
  const id = firstOrderByIdempotency.get(idempotencyKey);
  return id ? firstOrderStore.get(id) : undefined;
}

export function listFirstOrderGates(): FirstSupplierOrderGate[] {
  return [...firstOrderStore.values()];
}

export function appendActivationAuditEvent(event: ActivationAuditEvent): void {
  auditLog.push(event);
  getPersistentStore()?.saveAudit({
    event_id: event.eventId,
    event_type: event.type,
    activation_id: event.activationId,
    supplier_id: event.supplierId,
    correlation_id: event.correlationId,
    timestamp: event.timestamp,
    detail_json: JSON.stringify(event.detail || {}),
  });
}

export function listActivationAuditEvents(filter?: {
  activationId?: string;
  type?: string;
}): ActivationAuditEvent[] {
  return auditLog.filter((e) => {
    if (filter?.activationId && e.activationId !== filter.activationId) return false;
    if (filter?.type && e.type !== filter.type) return false;
    return true;
  });
}

export function hydrateActivationFromPersistence(): void {
  const store = getPersistentStore();
  if (!store) return;
  for (const row of store.listActivations(5000)) {
    try {
      const parsed = JSON.parse(String(row.record_json || "{}")) as SupplierOrderActivationRequest;
      if (parsed.activationId) {
        activationStore.set(parsed.activationId, parsed);
        activationByIdempotency.set(parsed.idempotencyKey, parsed.activationId);
      }
    } catch {
      /* ignore */
    }
  }
  for (const row of store.listFirstOrders(5000)) {
    try {
      const parsed = JSON.parse(String(row.record_json || "{}")) as FirstSupplierOrderGate;
      if (parsed.firstOrderId) {
        firstOrderStore.set(parsed.firstOrderId, parsed);
        firstOrderByIdempotency.set(parsed.idempotencyKey, parsed.firstOrderId);
      }
    } catch {
      /* ignore */
    }
  }
}

export function getInflightActivation(key: string): Promise<SupplierOrderActivationRequest> | undefined {
  return inflightActivations.get(key);
}

export function setInflightActivation(key: string, promise: Promise<SupplierOrderActivationRequest>): void {
  inflightActivations.set(key, promise);
}

export function clearInflightActivation(key: string): void {
  inflightActivations.delete(key);
}

export function resetActivationForTests(): void {
  activationStore.clear();
  activationByIdempotency.clear();
  firstOrderStore.clear();
  firstOrderByIdempotency.clear();
  auditLog.splice(0, auditLog.length);
  inflightActivations.clear();
}

export function getLatestRehearsalForScope(scope: {
  supplierId: string;
  market: string;
  channel: string;
}): SupplierOrderGoLiveRehearsal | undefined {
  try {
    return listRehearsalRecords()
      .filter(
        (r) =>
          r.supplierId === scope.supplierId &&
          r.market === scope.market &&
          r.channel === scope.channel &&
          r.overallStatus === "PASSED"
      )
      .sort((a, b) => Date.parse(b.completedAt || b.startedAt) - Date.parse(a.completedAt || a.startedAt))[0];
  } catch {
    return undefined;
  }
}
