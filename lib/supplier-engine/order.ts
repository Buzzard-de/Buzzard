import type { SupplierOrderRequest, SupplierOrderResult } from "./types";
import { getSupplier } from "./registry";
import { hasCapability } from "./capabilities";

export async function createSupplierOrder(request: SupplierOrderRequest): Promise<SupplierOrderResult> {
  const supplier = getSupplier(request.supplierId);
  if (!supplier) {
    return { ok: false, dryRun: true, status: "REJECTED", message: "UNKNOWN_SUPPLIER" };
  }
  if (!hasCapability(supplier.capabilities, "orderAPI")) {
    return { ok: false, dryRun: true, status: "CAPABILITY_MISSING", message: "orderAPI not configured" };
  }
  return {
    ok: true,
    dryRun: true,
    supplierOrderId: `DRY-ORD-${Date.now()}`,
    status: "PREPARED_NOT_SENT",
    message: "Order foundation only — no real supplier dispatch",
  };
}

export async function getSupplierOrder(
  supplierId: string,
  supplierOrderId: string
): Promise<{ ok: boolean; status: string; dryRun: boolean }> {
  void supplierOrderId;
  const supplier = getSupplier(supplierId);
  if (!supplier || !hasCapability(supplier.capabilities, "orderAPI")) {
    return { ok: false, status: "CAPABILITY_MISSING", dryRun: true };
  }
  return { ok: true, status: "DRY_RUN", dryRun: true };
}

export async function cancelSupplierOrder(
  supplierId: string,
  supplierOrderId: string
): Promise<{ ok: boolean; dryRun: boolean }> {
  void supplierOrderId;
  const supplier = getSupplier(supplierId);
  if (!supplier || !hasCapability(supplier.capabilities, "orderAPI")) {
    return { ok: false, dryRun: true };
  }
  return { ok: true, dryRun: true };
}

export async function getSupplierTracking(
  supplierId: string,
  supplierOrderId: string
): Promise<{ ok: boolean; trackingNumber?: string; dryRun: boolean }> {
  void supplierOrderId;
  const supplier = getSupplier(supplierId);
  if (!supplier || !hasCapability(supplier.capabilities, "trackingAPI")) {
    return { ok: false, dryRun: true };
  }
  return { ok: true, trackingNumber: undefined, dryRun: true };
}
