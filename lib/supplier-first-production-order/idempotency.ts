import { buildSupplierOrderIdempotencyKey, getIdempotentSupplierOrder, recordIdempotentSupplierOrder } from "@/lib/supplier-engine/orderIdempotency";

export { buildSupplierOrderIdempotencyKey, getIdempotentSupplierOrder, recordIdempotentSupplierOrder };

export function checkSupplierOrderIdempotency(input: {
  supplierId: string;
  orderId: string;
  clientIdempotencyKey?: string;
}): { duplicate: boolean; existingSupplierOrderId?: string; key: string } {
  const key = buildSupplierOrderIdempotencyKey(input.supplierId, input.orderId, input.clientIdempotencyKey);
  const existing = getIdempotentSupplierOrder(key);
  if (existing) {
    return { duplicate: true, existingSupplierOrderId: existing, key };
  }
  return { duplicate: false, key };
}
