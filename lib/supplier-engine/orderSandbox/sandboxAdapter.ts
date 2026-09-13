import { createHash } from "crypto";
import type { SupplierOrderPayload, SupplierOrderSandboxTracking } from "./types";

export function buildDeterministicSandboxOrderId(
  buzzardOrderId: string,
  supplierId: string,
  idempotencyKey: string
): string {
  const hash = createHash("sha256")
    .update(`${buzzardOrderId}:${supplierId}:${idempotencyKey}`)
    .digest("hex")
    .slice(0, 12)
    .toUpperCase();
  return `SANDBOX-ORDER-${hash}`;
}

export function buildSupplierOrderIdempotencyKey(buzzardOrderId: string, supplierId: string): string {
  return `BUZZARD-${buzzardOrderId}-${supplierId}`;
}

export function buildSandboxTracking(
  supplierOrderId: string,
  simulateShipped = true
): SupplierOrderSandboxTracking {
  const suffix = supplierOrderId.replace(/^SANDBOX-ORDER-/, "").slice(-8);
  return {
    supplierOrderReference: supplierOrderId,
    carrier: "SANDBOX_CARRIER",
    trackingNumber: `SBX-TRK-${suffix}`,
    trackingUrl: `https://sandbox.buzzard.local/tracking/${suffix}`,
    shipmentStatus: simulateShipped ? "IN_TRANSIT" : "LABEL_CREATED",
    simulated: true,
  };
}

export function validateSandboxPayload(payload: SupplierOrderPayload): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!payload.buzzardOrderId) errors.push("MISSING_BUZZARD_ORDER_ID");
  if (!payload.supplierId) errors.push("MISSING_SUPPLIER_ID");
  if (!payload.lines?.length) errors.push("MISSING_LINES");
  if (!payload.shippingDestination?.country) errors.push("MISSING_SHIPPING_COUNTRY");
  for (const line of payload.lines || []) {
    if (!line.supplierSku) errors.push("MISSING_SUPPLIER_SKU");
    if (line.quantity <= 0) errors.push("INVALID_QUANTITY");
    if (line.unitPrice < 0) errors.push("INVALID_UNIT_PRICE");
  }
  return { valid: errors.length === 0, errors };
}
