import type { SupplierOrderRequest, SupplierOrderResult } from "./types";
import { getSupplier } from "./registry";
import { hasCapability } from "./capabilities";
import { isSupplierOrderNetworkEnabled } from "./network";
import {
  buildSupplierOrderIdempotencyKey,
  getIdempotentSupplierOrder,
  recordIdempotentSupplierOrder,
} from "./orderIdempotency";
import { runSupplierOrderSandbox } from "./orderSandbox/orchestrator";
import { filterSupplierFulfillmentAddress, sanitizePayloadForInspection } from "./orderSandbox/piiFilter";
import type { SupplierOrderSandboxInput } from "./orderSandbox/types";

export type { SupplierOrderSandboxInput };

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
  return {
    supplierId: request.supplierId,
    orderId: request.orderId,
    lines: request.lines,
    shippingAddress: filterSupplierFulfillmentAddress(request.shippingAddress),
    dropshipping: request.dropshipping ?? false,
    whiteLabel: request.whiteLabel ?? false,
    blindShipping: request.blindShipping ?? false,
    customerSafe: true,
  };
}

export async function createSupplierOrder(
  request: SupplierOrderSandboxInput
): Promise<SupplierOrderResult> {
  const supplier = getSupplier(request.supplierId);
  if (!supplier) {
    return { ok: false, dryRun: true, status: "REJECTED", message: "UNKNOWN_SUPPLIER" };
  }

  const legacyKey = buildSupplierOrderIdempotencyKey(
    request.supplierId,
    request.orderId,
    request.idempotencyKey
  );
  const existingOrderId = getIdempotentSupplierOrder(legacyKey);
  if (existingOrderId) {
    return {
      ok: true,
      dryRun: true,
      supplierOrderId: existingOrderId,
      status: "IDEMPOTENT_REPLAY",
      message: "Duplicate order retry — existing supplier order reference returned",
    };
  }

  if (isSupplierOrderNetworkEnabled()) {
    return {
      ok: false,
      dryRun: true,
      status: "ORDER_NETWORK_REQUIRED",
      message: "Real supplier order dispatch requires explicit network enablement — blocked in #335",
    };
  }

  const sandboxResult = await runSupplierOrderSandbox(request);
  if (sandboxResult.supplierOrderId) {
    recordIdempotentSupplierOrder(legacyKey, sandboxResult.supplierOrderId);
  }

  return {
    ok: sandboxResult.ok,
    dryRun: true,
    supplierOrderId: sandboxResult.supplierOrderId,
    status: sandboxResult.idempotentReplay ? "IDEMPOTENT_REPLAY" : sandboxResult.status,
    message: sandboxResult.message,
  };
}

export function validateSupplierOrderPayload(request: SupplierOrderRequest): {
  valid: boolean;
  errors: string[];
  payload?: SupplierOrderDryRunPayload;
  sanitized?: Record<string, unknown>;
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
  const payload = buildDryRunPayload(request);
  const sanitized = sanitizePayloadForInspection(payload as unknown as Record<string, unknown>);
  if (errors.length) return { valid: false, errors, sanitized };
  return { valid: true, errors: [], payload, sanitized };
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
  return { ok: true, status: "SANDBOX", dryRun: true };
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
