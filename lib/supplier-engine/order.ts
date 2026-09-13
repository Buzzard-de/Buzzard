import type { SupplierOrderRequest, SupplierOrderResult } from "./types";
import { getSupplier } from "./registry";
import { hasCapability } from "./capabilities";
import { redactSecrets } from "./security";
import { isSupplierOrderNetworkEnabled } from "./network";
import {
  buildSupplierOrderIdempotencyKey,
  getIdempotentSupplierOrder,
  recordIdempotentSupplierOrder,
} from "./orderIdempotency";

export interface SupplierOrderDryRunPayload {
  supplierId: string;
  orderId: string;
  lines: SupplierOrderRequest["lines"];
  shippingAddress: Record<string, string>;
  dropshipping: boolean;
  whiteLabel: boolean;
  blindShipping: boolean;
  customerSafe: boolean;
}

function buildDryRunPayload(request: SupplierOrderRequest): SupplierOrderDryRunPayload {
  const safeAddress: Record<string, string> = {};
  for (const [key, value] of Object.entries(request.shippingAddress || {})) {
    if (/payment|card|cvv|iban/i.test(key)) continue;
    safeAddress[key] = value;
  }
  return {
    supplierId: request.supplierId,
    orderId: request.orderId,
    lines: request.lines,
    shippingAddress: safeAddress,
    dropshipping: request.dropshipping ?? false,
    whiteLabel: request.whiteLabel ?? false,
    blindShipping: request.blindShipping ?? false,
    customerSafe: true,
  };
}

export async function createSupplierOrder(
  request: SupplierOrderRequest & { idempotencyKey?: string }
): Promise<SupplierOrderResult> {
  const supplier = getSupplier(request.supplierId);
  if (!supplier) {
    return { ok: false, dryRun: true, status: "REJECTED", message: "UNKNOWN_SUPPLIER" };
  }
  if (!hasCapability(supplier.capabilities, "orderAPI") && !supplier.capabilities.createOrder) {
    return { ok: false, dryRun: true, status: "CAPABILITY_MISSING", message: "orderAPI not configured" };
  }

  const idempotencyKey = buildSupplierOrderIdempotencyKey(
    request.supplierId,
    request.orderId,
    request.idempotencyKey
  );
  const existingOrderId = getIdempotentSupplierOrder(idempotencyKey);
  if (existingOrderId) {
    return {
      ok: true,
      dryRun: true,
      supplierOrderId: existingOrderId,
      status: "IDEMPOTENT_REPLAY",
      message: "Duplicate order retry — existing supplier order reference returned",
    };
  }

  const payload = buildDryRunPayload(request);
  void redactSecrets(payload);

  if (!isSupplierOrderNetworkEnabled()) {
    const supplierOrderId = `DRY-ORD-${Date.now()}`;
    recordIdempotentSupplierOrder(idempotencyKey, supplierOrderId);
    return {
      ok: true,
      dryRun: true,
      supplierOrderId,
      status: "PREPARED_NOT_SENT",
      message: "Order foundation only — supplier order network disabled",
    };
  }

  return {
    ok: false,
    dryRun: true,
    status: "ORDER_NETWORK_REQUIRED",
    message: "Real supplier order dispatch requires explicit network enablement",
  };
}

export function validateSupplierOrderPayload(request: SupplierOrderRequest): {
  valid: boolean;
  errors: string[];
  payload?: SupplierOrderDryRunPayload;
} {
  const errors: string[] = [];
  if (!request.supplierId) errors.push("MISSING_SUPPLIER_ID");
  if (!request.orderId) errors.push("MISSING_ORDER_ID");
  if (!request.lines?.length) errors.push("MISSING_LINES");
  for (const line of request.lines || []) {
    if (!line.supplierSku) errors.push("MISSING_SUPPLIER_SKU");
    if (line.quantity <= 0) errors.push("INVALID_QUANTITY");
  }
  if (!request.shippingAddress?.country) errors.push("MISSING_SHIPPING_COUNTRY");
  if (errors.length) return { valid: false, errors };
  return { valid: true, errors: [], payload: buildDryRunPayload(request) };
}

export async function getSupplierOrder(
  supplierId: string,
  supplierOrderId: string
): Promise<{ ok: boolean; status: string; dryRun: boolean }> {
  void supplierOrderId;
  const supplier = getSupplier(supplierId);
  if (!supplier || (!hasCapability(supplier.capabilities, "orderAPI") && !supplier.capabilities.orderStatus)) {
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
  if (!supplier || (!hasCapability(supplier.capabilities, "orderAPI") && !supplier.capabilities.cancelOrder)) {
    return { ok: false, dryRun: true };
  }
  return { ok: true, dryRun: true };
}

export async function getSupplierTracking(
  supplierId: string,
  supplierOrderId: string
): Promise<{ ok: boolean; trackingNumber?: string; dryRun: boolean }> {
  const { fetchSupplierTracking } = await import("./tracking");
  const snapshot = await fetchSupplierTracking(supplierId, supplierOrderId);
  return {
    ok: snapshot.ok,
    trackingNumber: snapshot.trackingNumber,
    dryRun: snapshot.dryRun,
  };
}
