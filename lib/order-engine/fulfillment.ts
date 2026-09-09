import type { AddressSnapshot, BuzzardOrder, OrderItem, SupplierOrderRecord } from "./types";

/** Dry-run supplier order preparation — does NOT send to real supplier. */
export function prepareSupplierOrders(order: BuzzardOrder): {
  ok: boolean;
  supplierOrders: SupplierOrderRecord[];
  errorMessage?: string;
} {
  const bySupplier = new Map<string, OrderItem[]>();
  for (const item of order.items) {
    const list = bySupplier.get(item.supplierId) ?? [];
    list.push(item);
    bySupplier.set(item.supplierId, list);
  }

  const supplierOrders: SupplierOrderRecord[] = [];

  for (const [supplierId, items] of bySupplier) {
    supplierOrders.push({
      supplierOrderId: `DRY-SUP-${supplierId}-${order.orderId}`,
      orderId: order.orderId,
      supplierId,
      status: "PREPARED",
      dryRun: true,
      items: items.map((i) => ({
        productId: i.productId,
        supplierSku: i.sku,
        quantity: i.quantity,
        supplierCost: i.supplierCostSnapshot,
      })),
      shippingAddress: sanitizeAddressForSupplier(order.shippingAddress),
      preparedAt: new Date().toISOString(),
      message: "Dry-run supplier order — not dispatched to real supplier",
    });
  }

  return { ok: true, supplierOrders };
}

function sanitizeAddressForSupplier(address: AddressSnapshot): AddressSnapshot {
  return { ...address };
}

export function cancelPreparedSupplierOrders(order: BuzzardOrder): SupplierOrderRecord[] {
  return order.supplierOrders.map((so) => ({
    ...so,
    status: "CANCELLED" as const,
    message: "Cancelled — dry-run only",
  }));
}
