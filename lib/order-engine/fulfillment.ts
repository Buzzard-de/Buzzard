import { createSupplierOrder } from "@/lib/supplier-engine/order";
import { getSupplier } from "@/lib/supplier-engine/registry";
import type { AddressSnapshot, BuzzardOrder, OrderItem, SupplierOrderRecord, SupplierOrderStatus } from "./types";

function sanitizeAddressForSupplier(address: AddressSnapshot): Record<string, string> {
  return {
    recipientName: address.recipientName,
    company: address.company || "",
    street: address.street,
    houseNumber: address.houseNumber || "",
    postalCode: address.postalCode,
    city: address.city,
    state: address.state || "",
    country: address.country,
  };
}

function mapSandboxStatus(status: string): SupplierOrderStatus {
  switch (status) {
    case "SANDBOX_ACCEPTED":
    case "VALIDATED":
    case "PREPARED":
      return "PREPARED";
    case "SUPPLIER_PENDING":
    case "SUPPLIER_CONFIRMED":
    case "PROCESSING":
      return "SUBMITTED";
    case "SHIPPED":
      return "SHIPPED";
    case "DELIVERED":
      return "DELIVERED";
    case "FAILED":
      return "FAILED";
    case "CANCELLED":
      return "CANCELLED";
    case "IDEMPOTENT_REPLAY":
      return "PREPARED";
    default:
      return "PREPARED";
  }
}

/** Sandbox supplier order preparation — does NOT send to real supplier network. */
export async function prepareSupplierOrders(order: BuzzardOrder): Promise<{
  ok: boolean;
  supplierOrders: SupplierOrderRecord[];
  errorMessage?: string;
}> {
  const bySupplier = new Map<string, OrderItem[]>();
  for (const item of order.items) {
    const list = bySupplier.get(item.supplierId) ?? [];
    list.push(item);
    bySupplier.set(item.supplierId, list);
  }

  const supplierOrders: SupplierOrderRecord[] = [];

  for (const [supplierId, items] of bySupplier) {
    const supplier = getSupplier(supplierId);
    const result = await createSupplierOrder({
      supplierId,
      orderId: order.orderId,
      idempotencyKey: order.idempotencyKey,
      correlationId: order.orderId,
      currency: order.currency,
      priceSnapshotId: order.priceSnapshotId,
      customerReference: order.orderNumber,
      billingAddress: sanitizeAddressForSupplier(order.billingAddress),
      lines: items.map((item) => ({
        supplierSku: item.sku,
        quantity: item.quantity,
        unitPrice: item.supplierCostSnapshot,
      })),
      shippingAddress: sanitizeAddressForSupplier(order.shippingAddress),
      dropshipping: supplier?.capabilities.dropshipping ?? false,
      whiteLabel: supplier?.capabilities.whiteLabel ?? false,
      blindShipping: supplier?.capabilities.blindShipping ?? false,
      productId: items[0]?.productId,
    });

    if (!result.ok) {
      return {
        ok: false,
        supplierOrders,
        errorMessage: result.message || "SUPPLIER_ORDER_SANDBOX_FAILED",
      };
    }

    supplierOrders.push({
      supplierOrderId: result.supplierOrderId || `SANDBOX-MISSING-${supplierId}-${order.orderId}`,
      orderId: order.orderId,
      supplierId,
      status: mapSandboxStatus(String(result.status)),
      dryRun: true,
      items: items.map((i) => ({
        productId: i.productId,
        supplierSku: i.sku,
        quantity: i.quantity,
        supplierCost: i.supplierCostSnapshot,
      })),
      shippingAddress: order.shippingAddress,
      preparedAt: new Date().toISOString(),
      message: result.message || "Sandbox supplier order — no real supplier network dispatch",
    });
  }

  return { ok: true, supplierOrders };
}

export function cancelPreparedSupplierOrders(order: BuzzardOrder): SupplierOrderRecord[] {
  return order.supplierOrders.map((so) => ({
    ...so,
    status: "CANCELLED" as const,
    message: "Cancelled — sandbox dry-run only",
  }));
}
