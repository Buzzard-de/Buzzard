const orderIdempotencyKeys = new Map<string, { supplierOrderId: string; createdAt: string }>();

export function buildSupplierOrderIdempotencyKey(
  supplierId: string,
  buzzardOrderId: string,
  idempotencyKey?: string
): string {
  return `${supplierId}:${buzzardOrderId}:${idempotencyKey || "default"}`;
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
  orderIdempotencyKeys.set(key, { supplierOrderId, createdAt: new Date().toISOString() });
  return { replay: false, supplierOrderId };
}

export function resetOrderIdempotencyKeys(): void {
  orderIdempotencyKeys.clear();
}
