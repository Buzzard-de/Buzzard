import { randomUUID } from "crypto";
import { isAiActor } from "@/lib/supplier-production-order-validation/eligibility";
import { recordFirstOrderAudit } from "./audit";
import {
  buildFirstOrderIdempotencyKey,
  FIRST_ORDER_TTL_MS,
  getInterCarsSupplierId,
} from "./config";
import { isFirstOrderKillSwitched } from "./killSwitch";
import { runFirstProductionOrderPreflight } from "./preflight";
import {
  getFirstProductionOrderByIdempotency,
  getFirstProductionOrderRecord,
  saveFirstProductionOrderRecord,
} from "./persistence";
import { assertFirstOrderNetworkSafety } from "./safety";
import { emitFirstOrderAnalytics } from "./analytics";
import type { FirstProductionOrderInput, FirstProductionOrderRecord } from "./types";

export function requestFirstProductionOrder(input: FirstProductionOrderInput): FirstProductionOrderRecord {
  assertFirstOrderNetworkSafety();

  const supplier = input.supplier || getInterCarsSupplierId();
  const market = input.market || "DE";
  const channel = input.channel || "DIRECT";
  const environment = input.environment || "PRODUCTION";
  const orderId = input.orderId || `FPO-${Date.now()}`;
  const idempotencyKey =
    input.idempotencyKey ||
    buildFirstOrderIdempotencyKey({ supplier, market, channel, orderId, requester: input.requester });

  const existing = getFirstProductionOrderByIdempotency(idempotencyKey);
  if (existing) return existing;

  const correlationId = input.correlationId || randomUUID();
  const executionId = `fpo344_${randomUUID().slice(0, 12)}`;
  const now = new Date().toISOString();

  recordFirstOrderAudit({
    type: "FIRST_ORDER_REQUESTED",
    executionId,
    orderId,
    supplierId: supplier,
    correlationId,
    actor: input.requester,
  });

  if (isAiActor(input.requester)) {
    return buildBlockedRecord({
      executionId,
      orderId,
      supplier,
      input,
      idempotencyKey,
      correlationId,
      now,
      blockers: ["AI_BOUNDARY:REQUEST_FORBIDDEN"],
      checks: [],
    });
  }

  if (isFirstOrderKillSwitched({ supplierId: supplier, market, channel })) {
    recordFirstOrderAudit({
      type: "FIRST_ORDER_KILL_SWITCHED",
      executionId,
      supplierId: supplier,
      correlationId,
      actor: input.requester,
    });
    return buildBlockedRecord({
      executionId,
      orderId,
      supplier,
      input,
      idempotencyKey,
      correlationId,
      now,
      blockers: ["KILL_SWITCH_ACTIVE"],
      checks: [],
    });
  }

  const preflight = runFirstProductionOrderPreflight({ ...input, orderId, armingId: input.armingId });
  const state = preflight.blockers.length === 0 ? "FIRST_ORDER_READY" : "BLOCKED";

  recordFirstOrderAudit({
    type: state === "FIRST_ORDER_READY" ? "FIRST_ORDER_PREFLIGHT" : "FIRST_ORDER_BLOCKED",
    executionId,
    orderId,
    supplierId: supplier,
    correlationId,
    actor: input.requester,
    detail: { blockers: preflight.blockers },
  });

  const record: FirstProductionOrderRecord = {
    executionId,
    orderId,
    supplier,
    state,
    scope: preflight.scope,
    limits: preflight.limits,
    payload: preflight.payload || {
      orderId,
      purpose: "FIRST_PRODUCTION_ORDER",
      supplierId: supplier,
      market,
      channel,
      items: [{ sku: "pending", quantity: 1, unitCost: 0 }],
      shippingAddress: { country: market, city: "Pending" },
      currency: input.currency || "EUR",
      inventoryReservationId: "pending",
      priceSnapshotId: "pending",
      priceSnapshotHash: "pending",
      supplierAssignmentSnapshotId: "pending",
      payloadHash: "pending",
      armingId: preflight.armingId || input.armingId || "none",
    },
    validationId: preflight.validationId || "none",
    armingId: preflight.armingId || input.armingId || "none",
    blockerCodes: preflight.blockers,
    checks: preflight.checks,
    correlationId,
    idempotencyKey,
    requestedBy: input.requester,
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(Date.now() + FIRST_ORDER_TTL_MS).toISOString(),
  };

  saveFirstProductionOrderRecord(record);
  emitFirstOrderAnalytics({
    eventType: state === "FIRST_ORDER_READY" ? "first_order_ready" : "first_order_blocked",
    executionId,
    supplierId: supplier,
    correlationId,
  });

  return record;
}

function buildBlockedRecord(params: {
  executionId: string;
  orderId: string;
  supplier: string;
  input: FirstProductionOrderInput;
  idempotencyKey: string;
  correlationId: string;
  now: string;
  blockers: string[];
  checks: FirstProductionOrderRecord["checks"];
}): FirstProductionOrderRecord {
  const record: FirstProductionOrderRecord = {
    executionId: params.executionId,
    orderId: params.orderId,
    supplier: params.supplier,
    state: "BLOCKED",
    scope: {
      supplier: params.supplier,
      market: params.input.market || "DE",
      channel: params.input.channel || "DIRECT",
      environment: params.input.environment || "PRODUCTION",
      currency: params.input.currency || "EUR",
    },
    limits: {
      maximumQuantity: 1,
      maximumOrderValue: 500,
      allowedSupplier: params.supplier,
      allowedMarket: params.input.market || "DE",
      allowedCurrency: params.input.currency || "EUR",
    },
    payload: {
      orderId: params.orderId,
      purpose: "FIRST_PRODUCTION_ORDER",
      supplierId: params.supplier,
      market: params.input.market || "DE",
      channel: params.input.channel || "DIRECT",
      items: [],
      shippingAddress: { country: "DE", city: "Blocked" },
      currency: "EUR",
      inventoryReservationId: "none",
      priceSnapshotId: "none",
      priceSnapshotHash: "none",
      supplierAssignmentSnapshotId: "none",
      payloadHash: "none",
      armingId: params.input.armingId || "none",
    },
    validationId: "none",
    armingId: params.input.armingId || "none",
    blockerCodes: params.blockers,
    checks: params.checks,
    correlationId: params.correlationId,
    idempotencyKey: params.idempotencyKey,
    requestedBy: params.input.requester,
    createdAt: params.now,
    updatedAt: params.now,
    expiresAt: new Date(Date.now() + FIRST_ORDER_TTL_MS).toISOString(),
  };
  saveFirstProductionOrderRecord(record);
  return record;
}

export function cancelFirstProductionOrder(input: {
  executionId: string;
  actorId: string;
}): { ok: boolean; record?: FirstProductionOrderRecord; blockers?: string[] } {
  if (isAiActor(input.actorId)) return { ok: false, blockers: ["AI_BOUNDARY:CANCEL_FORBIDDEN"] };

  const record = getFirstProductionOrderRecord(input.executionId);
  if (!record) return { ok: false, blockers: ["EXECUTION_NOT_FOUND"] };
  if (["EXECUTED", "EXECUTING"].includes(record.state)) {
    return { ok: false, blockers: ["CANNOT_CANCEL_AFTER_EXECUTION"] };
  }

  record.state = "CANCELLED";
  record.updatedAt = new Date().toISOString();
  saveFirstProductionOrderRecord(record);

  recordFirstOrderAudit({
    type: "FIRST_ORDER_CANCELLED",
    executionId: record.executionId,
    orderId: record.orderId,
    supplierId: record.supplier,
    correlationId: record.correlationId,
    actor: input.actorId,
  });

  return { ok: true, record };
}
