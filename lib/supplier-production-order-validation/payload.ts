import { createHash } from "crypto";
import { getOrder } from "@/lib/order-engine";
import { filterSupplierFulfillmentAddress } from "@/lib/supplier-engine/orderSandbox/piiFilter";
import { validateSupplierOrderPayload } from "@/lib/supplier-engine/order";
import { buildSupplierOrderIdempotencyKey } from "@/lib/supplier-engine/orderIdempotency";
import { getInterCarsAdapterProfile, getInterCarsSupplierId } from "./config";
import type { ValidationCheckResult } from "./types";

export interface CanonicalCreateOrderPayload {
  buzzardOrderId: string;
  supplierId: string;
  adapterProfile: string;
  idempotencyKey: string;
  lines: Array<{ supplierSku: string; quantity: number; unitPrice: number }>;
  shippingAddress: Record<string, string>;
  currency: string;
  priceSnapshotId: string;
  inventoryReservationIds: string[];
  supplierAssignmentSnapshotIds: string[];
}

export function hashCreateOrderPayload(payload: Record<string, unknown>): string {
  const keys = Object.keys(payload).sort();
  const canonical = JSON.stringify(payload, keys);
  return createHash("sha256").update(canonical).digest("hex").slice(0, 16);
}

export function buildCanonicalPayloadFromOrder(orderId: string): {
  payload?: CanonicalCreateOrderPayload;
  checks: ValidationCheckResult[];
  blockers: string[];
  payloadHash?: string;
} {
  const checks: ValidationCheckResult[] = [];
  const blockers: string[] = [];
  const order = getOrder(orderId);
  if (!order) {
    checks.push({ check: "ORDER", category: "ORDER", status: "BLOCKED", message: "Order not found", blocking: true });
    blockers.push("ORDER_NOT_FOUND");
    return { checks, blockers };
  }

  const interCarsId = getInterCarsSupplierId();
  const assignment = order.supplierAssignments.find((a) => a.supplierId === interCarsId);
  if (!assignment) {
    checks.push({
      check: "SUPPLIER_ASSIGNMENT",
      category: "SUPPLIER",
      status: "BLOCKED",
      message: "Inter Cars not assigned",
      blocking: true,
    });
    blockers.push("SUPPLIER_ASSIGNMENT_MISMATCH");
    return { checks, blockers };
  }

  const lines = order.items
    .filter((i) => i.supplierId === interCarsId)
    .map((i) => ({
      supplierSku: assignment.supplierSku || i.sku,
      quantity: i.quantity,
      unitPrice: i.supplierCostSnapshot,
    }));

  const shippingAddress = filterSupplierFulfillmentAddress(
    order.shippingAddress as unknown as Record<string, string>,
  );
  const supplierRequest = {
    supplierId: interCarsId,
    orderId: order.orderId,
    lines,
    shippingAddress,
  };

  const validation = validateSupplierOrderPayload(supplierRequest);
  if (!validation.valid) {
    checks.push({
      check: "REQUEST_SCHEMA",
      category: "REQUEST",
      status: "BLOCKED",
      message: validation.errors.join(","),
      blocking: true,
    });
    blockers.push("REQUEST_SCHEMA_INVALID");
    return { checks, blockers, payloadHash: validation.sanitized ? hashCreateOrderPayload(validation.sanitized) : undefined };
  }

  const idempotencyKey = buildSupplierOrderIdempotencyKey(interCarsId, order.orderId, order.idempotencyKey);
  const payload: CanonicalCreateOrderPayload = {
    buzzardOrderId: order.orderId,
    supplierId: interCarsId,
    adapterProfile: getInterCarsAdapterProfile(),
    idempotencyKey,
    lines,
    shippingAddress,
    currency: order.currency,
    priceSnapshotId: order.priceSnapshotId,
    inventoryReservationIds: order.reservationIds,
    supplierAssignmentSnapshotIds: order.supplierAssignments.map((a) => a.supplierOfferId),
  };

  const payloadHash = hashCreateOrderPayload({
    orderId: payload.buzzardOrderId,
    supplierId: payload.supplierId,
    lines: payload.lines,
    idempotencyKey: payload.idempotencyKey,
  });

  checks.push({ check: "REQUEST_SCHEMA", category: "REQUEST", status: "PASS", message: "Request contract valid" });
  return { payload, checks, blockers, payloadHash };
}
