import { getSupplierPersistence } from "../persistence";
import type { SupplierOrderSandboxRecord } from "./types";

const memoryStore = new Map<string, SupplierOrderSandboxRecord>();

function rowToRecord(row: Record<string, unknown>): SupplierOrderSandboxRecord {
  return {
    supplierOrderId: String(row.supplier_order_id),
    buzzardOrderId: String(row.buzzard_order_id),
    supplierId: String(row.supplier_id),
    status: row.status as SupplierOrderSandboxRecord["status"],
    idempotencyKey: String(row.idempotency_key),
    correlationId: String(row.correlation_id || ""),
    payload: JSON.parse(String(row.payload_json || "{}")),
    tracking: row.tracking_json ? JSON.parse(String(row.tracking_json)) : undefined,
    failureClass: row.failure_class as SupplierOrderSandboxRecord["failureClass"],
    failureCode: row.failure_code ? String(row.failure_code) : undefined,
    failureMessage: row.failure_message ? String(row.failure_message) : undefined,
    latencyMs: Number(row.latency_ms || 0),
    sandbox: true,
    networkDispatched: false,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function getOrderSandboxPersistence() {
  return getSupplierPersistence() as {
    saveOrderSandbox?: (row: Record<string, unknown>) => void;
    getOrderSandboxByIdempotency?: (key: string) => Record<string, unknown> | undefined;
    getOrderSandboxByReference?: (id: string) => Record<string, unknown> | undefined;
    getLastOrderSandboxForSupplier?: (id: string) => Record<string, unknown> | undefined;
    listOrderSandbox?: () => Record<string, unknown>[];
  } | null;
}

export function saveSupplierOrderSandboxRecord(record: SupplierOrderSandboxRecord): void {
  memoryStore.set(record.idempotencyKey, record);
  memoryStore.set(record.supplierOrderId, record);
  const persistence = getOrderSandboxPersistence();
  const typed = persistence as {
    saveOrderSandbox?: (row: Record<string, unknown>) => void;
  } | null;
  typed?.saveOrderSandbox?.({
    supplier_order_id: record.supplierOrderId,
    buzzard_order_id: record.buzzardOrderId,
    supplier_id: record.supplierId,
    status: record.status,
    idempotency_key: record.idempotencyKey,
    correlation_id: record.correlationId,
    payload_json: JSON.stringify(record.payload),
    tracking_json: record.tracking ? JSON.stringify(record.tracking) : null,
    failure_class: record.failureClass || null,
    failure_code: record.failureCode || null,
    failure_message: record.failureMessage || null,
    latency_ms: record.latencyMs,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  });
}

export function getSupplierOrderSandboxByIdempotency(
  idempotencyKey: string
): SupplierOrderSandboxRecord | undefined {
  const cached = memoryStore.get(idempotencyKey);
  if (cached) return cached;
  const row = getOrderSandboxPersistence()?.getOrderSandboxByIdempotency?.(idempotencyKey);
  if (!row) return undefined;
  const record = rowToRecord(row);
  memoryStore.set(record.idempotencyKey, record);
  memoryStore.set(record.supplierOrderId, record);
  return record;
}

export function getSupplierOrderSandboxByReference(
  supplierOrderId: string
): SupplierOrderSandboxRecord | undefined {
  const cached = memoryStore.get(supplierOrderId);
  if (cached) return cached;
  const row = getOrderSandboxPersistence()?.getOrderSandboxByReference?.(supplierOrderId);
  if (!row) return undefined;
  const record = rowToRecord(row);
  memoryStore.set(record.idempotencyKey, record);
  memoryStore.set(record.supplierOrderId, record);
  return record;
}

export function getLastSupplierOrderSandboxForSupplier(
  supplierId: string
): SupplierOrderSandboxRecord | undefined {
  const records = [...memoryStore.values()].filter((r) => r.supplierId === supplierId);
  if (records.length) {
    return records.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  }
  const row = getOrderSandboxPersistence()?.getLastOrderSandboxForSupplier?.(supplierId);
  return row ? rowToRecord(row) : undefined;
}

export function resetSupplierOrderSandboxStore(): void {
  memoryStore.clear();
}

export function hydrateSupplierOrderSandboxFromPersistence(): void {
  const rows = getOrderSandboxPersistence()?.listOrderSandbox?.() || [];
  for (const row of rows) {
    const record = rowToRecord(row);
    memoryStore.set(record.idempotencyKey, record);
    memoryStore.set(record.supplierOrderId, record);
  }
}
