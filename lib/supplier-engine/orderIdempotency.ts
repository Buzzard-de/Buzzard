import { bootstrapSupplierEnginePersistence } from "./bootstrap";
import { getSupplierPersistence } from "./persistence";

const orderIdempotencyKeys = new Map<string, { supplierOrderId: string; createdAt: string }>();

export function buildSupplierOrderIdempotencyKey(
  supplierId: string,
  buzzardOrderId: string,
  idempotencyKey?: string
): string {
  if (idempotencyKey) return `${supplierId}:${buzzardOrderId}:${idempotencyKey}`;
  return `BUZZARD-${buzzardOrderId}-${supplierId}`;
}

export function getIdempotentSupplierOrder(key: string): string | undefined {
  return orderIdempotencyKeys.get(key)?.supplierOrderId;
}

export function recordIdempotentSupplierOrder(
  key: string,
  supplierOrderId: string
): { replay: boolean; supplierOrderId: string } {
  const existing = orderIdempotencyKeys.get(key);
  if (existing) {
    return { replay: true, supplierOrderId: existing.supplierOrderId };
  }
  const createdAt = new Date().toISOString();
  orderIdempotencyKeys.set(key, { supplierOrderId, createdAt });
  bootstrapSupplierEnginePersistence();
  getSupplierPersistence()?.claimIdempotencyKey?.(key, key.split(":")[0] || "unknown");
  return { replay: false, supplierOrderId };
}

export function resetOrderIdempotencyKeys(): void {
  orderIdempotencyKeys.clear();
}
