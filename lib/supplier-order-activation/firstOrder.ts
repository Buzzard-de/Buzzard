import { filterSupplierFulfillmentAddress } from "@/lib/supplier-engine/orderSandbox/piiFilter";
import { resolveActivationConfig } from "./config";
import { hashPayload } from "./preflight";
import { evaluateKillSwitch } from "./killSwitch";
import { evaluateOrderLimits } from "./limits";
import { evaluateActivationRisk } from "./risk";
import { getApprovalForActivation, validateApprovalForActivation } from "./approval";
import { executeRealSupplierOrder } from "./activation";
import { recordActivationAudit } from "./audit";
import { emitActivationAnalytics } from "./analytics";
import {
  getActivationRecord,
  getFirstOrderByIdempotency,
  getFirstOrderGate,
  listFirstOrderGates,
  saveActivationRecord,
  saveFirstOrderGate,
} from "./persistence";
import type { FirstOrderPreview, FirstSupplierOrderGate } from "./types";

function nowIso(): string {
  return new Date().toISOString();
}

function buildFirstOrderId(): string {
  return `fo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface FirstOrderPayload {
  supplierId: string;
  market: string;
  channel: string;
  items: Array<{ sku: string; quantity: number; unitCost: number }>;
  shippingAddress: { country: string; city: string; postalCode?: string };
  currency: string;
  inventoryReservationId: string;
  priceSnapshotId: string;
  supplierAssignmentSnapshotId: string;
}

export function buildMinimalSupplierPayload(payload: FirstOrderPayload): Record<string, unknown> {
  const filtered = filterSupplierFulfillmentAddress(payload.shippingAddress);
  return {
    supplierId: payload.supplierId,
    market: payload.market,
    channel: payload.channel,
    items: payload.items.map((i) => ({ sku: i.sku, quantity: i.quantity })),
    shippingAddress: filtered,
    currency: payload.currency,
    inventoryReservationId: payload.inventoryReservationId,
    priceSnapshotId: payload.priceSnapshotId,
    supplierAssignmentSnapshotId: payload.supplierAssignmentSnapshotId,
  };
}

export function previewFirstOrder(input: {
  activationId: string;
  payload: FirstOrderPayload;
}): FirstOrderPreview {
  const activation = getActivationRecord(input.activationId);
  if (!activation) {
    throw new Error("ACTIVATION_NOT_FOUND");
  }

  const supplierPayload = buildMinimalSupplierPayload(input.payload);
  const orderPayloadHash = hashPayload(supplierPayload as Record<string, unknown>);
  const supplierPayloadHash = hashPayload({ supplierId: input.payload.supplierId, items: input.payload.items });
  const approval = getApprovalForActivation(activation.activationId);
  const approvalCheck = validateApprovalForActivation(activation, approval);
  const kill = evaluateKillSwitch(activation);
  const risk = evaluateActivationRisk(activation);
  const limits = evaluateOrderLimits({
    activation,
    orderValue: input.payload.items.reduce((sum, i) => sum + i.unitCost * i.quantity, 0),
    isFirstOrder: true,
    itemCount: input.payload.items.length,
    totalQuantity: input.payload.items.reduce((sum, i) => sum + i.quantity, 0),
  });

  const orderValue = input.payload.items.reduce((sum, i) => sum + i.unitCost * i.quantity, 0);

  return {
    supplierId: input.payload.supplierId,
    environment: activation.environment,
    market: input.payload.market,
    channel: input.payload.channel as FirstOrderPreview["channel"],
    orderValue,
    currency: input.payload.currency,
    itemCount: input.payload.items.length,
    orderPayloadHash,
    supplierPayloadHash,
    inventoryReservationId: input.payload.inventoryReservationId,
    priceSnapshotId: input.payload.priceSnapshotId,
    readinessStatus: activation.readinessId ? "READY" : "UNKNOWN",
    approvalStatus: approvalCheck.valid ? "APPROVED" : "BLOCKED",
    riskLevel: risk.riskLevel,
    killSwitchActive: kill.blocked,
    networkState: activation.networkState,
    createOrderCapability: "UNVERIFIED",
    gates: [
      { check: "APPROVAL", category: "APPROVAL", status: approvalCheck.valid ? "PASS" : "BLOCKED", message: approvalCheck.valid ? "Approved" : approvalCheck.blockers.join(",") },
      { check: "RISK", category: "RISK", status: risk.allowed ? "PASS" : "BLOCKED", message: risk.riskLevel },
      { check: "LIMITS", category: "LIMITS", status: limits.allowed ? "PASS" : "BLOCKED", message: limits.allowed ? "Within limits" : limits.blockers.join(",") },
      { check: "KILL_SWITCH", category: "KILL_SWITCH", status: kill.blocked ? "BLOCKED" : "PASS", message: kill.blocked ? "Active" : "Off" },
      { check: "CREATE_ORDER", category: "CAPABILITY", status: "BLOCKED", message: "createOrder UNVERIFIED", blocking: true },
      { check: "NETWORK", category: "NETWORK", status: activation.networkState === "ENABLED" ? "PASS" : "BLOCKED", message: activation.networkState },
    ],
    httpCallsMade: 0,
  };
}

export function prepareFirstOrderGate(input: {
  activationId: string;
  payload: FirstOrderPayload;
  idempotencyKey: string;
  actorId: string;
}): { ok: boolean; gate?: FirstSupplierOrderGate; blockers?: string[]; preview?: FirstOrderPreview } {
  const cfg = resolveActivationConfig();
  const existing = getFirstOrderByIdempotency(input.idempotencyKey);
  if (existing) {
    return { ok: true, gate: existing };
  }

  const activation = getActivationRecord(input.activationId);
  if (!activation) return { ok: false, blockers: ["ACTIVATION_NOT_FOUND"] };

  const preview = previewFirstOrder({ activationId: input.activationId, payload: input.payload });
  const blockers: string[] = [];
  if (preview.approvalStatus !== "APPROVED") blockers.push("APPROVAL_INVALID");
  if (preview.killSwitchActive) blockers.push("KILL_SWITCH_ACTIVE");
  if (!preview.gates.find((g) => g.check === "LIMITS") || preview.gates.find((g) => g.check === "LIMITS")?.status !== "PASS") {
    blockers.push("LIMITS_EXCEEDED");
  }
  if (preview.createOrderCapability === "UNVERIFIED") blockers.push("REAL_ORDER_ENDPOINT_NOT_VALIDATED");
  if (activation.networkState === "DISABLED") blockers.push("NETWORK_NOT_ARMED");

  const createdAt = nowIso();
  const gate: FirstSupplierOrderGate = {
    firstOrderId: buildFirstOrderId(),
    activationId: input.activationId,
    supplierId: input.payload.supplierId,
    market: input.payload.market,
    channel: input.payload.channel as FirstSupplierOrderGate["channel"],
    orderValue: preview.orderValue,
    currency: input.payload.currency,
    readinessStatus: preview.readinessStatus,
    approvalStatus: preview.approvalStatus,
    riskLevel: preview.riskLevel,
    limitsStatus: blockers.includes("LIMITS_EXCEEDED") ? "BLOCKED" : "PASS",
    killSwitchState: preview.killSwitchActive ? "ON" : "OFF",
    networkState: activation.networkState,
    orderPayloadHash: preview.orderPayloadHash,
    supplierPayloadHash: preview.supplierPayloadHash,
    inventoryReservationId: input.payload.inventoryReservationId,
    priceSnapshotId: input.payload.priceSnapshotId,
    status: blockers.length ? "BLOCKED" : "PREPARED",
    createdAt,
    expiresAt: new Date(Date.now() + cfg.firstOrderTtlMs).toISOString(),
    correlationId: activation.correlationId,
    idempotencyKey: input.idempotencyKey,
  };

  saveFirstOrderGate(gate);

  recordActivationAudit({
    type: blockers.length ? "FIRST_ORDER_BLOCKED" : "FIRST_ORDER_PREPARED",
    activationId: activation.activationId,
    firstOrderId: gate.firstOrderId,
    supplierId: gate.supplierId,
    correlationId: activation.correlationId,
    actor: input.actorId,
    detail: { blockers, orderPayloadHash: gate.orderPayloadHash },
  });

  emitActivationAnalytics({
    eventType: blockers.length ? "first_order_blocked" : "first_order_prepared",
    activationId: activation.activationId,
    supplierId: gate.supplierId,
    correlationId: activation.correlationId,
    detail: { firstOrderId: gate.firstOrderId },
  });

  return { ok: blockers.length === 0, gate, blockers, preview };
}

export function attemptFirstOrderSend(input: {
  firstOrderId: string;
  actorId: string;
  humanConfirmation: boolean;
  confirmationNonce: string;
}): ReturnType<typeof executeRealSupplierOrder> {
  const gate = getFirstOrderGate(input.firstOrderId);
  if (!gate) {
    return {
      ok: false,
      blocked: true,
      code: "FIRST_ORDER_NOT_FOUND",
      reason: "First order gate not found",
      guards: {},
      httpCallsMade: 0,
    };
  }

  if (new Date(gate.expiresAt).getTime() < Date.now()) {
    gate.status = "BLOCKED";
    saveFirstOrderGate(gate);
    return {
      ok: false,
      blocked: true,
      code: "FIRST_ORDER_EXPIRED",
      reason: "First order gate expired",
      guards: {},
      httpCallsMade: 0,
    };
  }

  return executeRealSupplierOrder({
    activationId: gate.activationId,
    actorId: input.actorId,
    humanConfirmation: input.humanConfirmation,
    confirmationNonce: input.confirmationNonce,
    idempotencyKey: gate.idempotencyKey,
    orderValue: gate.orderValue,
    payloadHash: gate.orderPayloadHash,
    inventoryReservationId: gate.inventoryReservationId,
  });
}

export function invalidateFirstOrderOnPayloadChange(input: {
  firstOrderId: string;
  newPayloadHash: string;
}): { invalidated: boolean; reason?: string } {
  const gate = getFirstOrderGate(input.firstOrderId);
  if (!gate) return { invalidated: false, reason: "NOT_FOUND" };
  if (gate.orderPayloadHash !== input.newPayloadHash) {
    gate.status = "BLOCKED";
    saveFirstOrderGate(gate);
    const activation = getActivationRecord(gate.activationId);
    if (activation) {
      activation.status = "BLOCKED";
      activation.reason = "PAYLOAD_HASH_CHANGED";
      saveActivationRecord(activation);
    }
    return { invalidated: true, reason: "PAYLOAD_HASH_CHANGED" };
  }
  return { invalidated: false };
}

export { getFirstOrderGate, listFirstOrderGates };
