import { randomUUID } from "crypto";
import { approveProductionOrderArming, validateArmingApproval } from "./approval";
import { runProductionArmingPreflight } from "./preflight";
import { assertArmingNotExpired } from "./expiry";
import { isArmingKillSwitched } from "./killSwitch";
import { recordArmingAudit } from "./audit";
import { emitArmingAnalytics } from "./analytics";
import {
  assertArmingNetworkSafety,
  recordBlockedProductionExecutionAttempt,
} from "./safety";
import {
  saveArmingRecord,
  getArmingByIdempotency,
} from "./persistence";
import {
  ARMING_TTL_MS,
  buildArmingIdempotencyKey,
  getInterCarsSupplierId,
} from "./config";
import { attemptFirstProductionOrderExecution as attemptFirstOrderExecution344 } from "@/lib/supplier-first-production-order/execution";
import { isAiActor } from "@/lib/supplier-production-order-validation/eligibility";
import type { ProductionArmingInput, ProductionOrderArmingRecord } from "./types";

export function requestProductionOrderArming(
  input: ProductionArmingInput,
): ProductionOrderArmingRecord {
  assertArmingNetworkSafety();

  const supplier = input.supplier || getInterCarsSupplierId();
  const idempotencyKey =
    input.idempotencyKey ||
    buildArmingIdempotencyKey({
      supplier,
      market: input.market || "DE",
      channel: input.channel || "DIRECT",
      environment: input.environment || "PRODUCTION",
      requester: input.requester,
    });

  const existing = getArmingByIdempotency(idempotencyKey);
  if (existing && ["ARMED", "ARMING_READY", "ARMING_BLOCKED", "EXPIRED", "DISARMED"].includes(existing.status)) {
    return existing;
  }

  return executeArmingRequest(input, { supplier, idempotencyKey });
}

function executeArmingRequest(
  input: ProductionArmingInput,
  ctx: { supplier: string; idempotencyKey: string },
): ProductionOrderArmingRecord {
  const now = new Date().toISOString();
  const correlationId = input.correlationId || randomUUID();
  const armingId = `arm343_${randomUUID().slice(0, 12)}`;

  recordArmingAudit({
    type: "PRODUCTION_ARMING_REQUESTED",
    armingId,
    supplierId: ctx.supplier,
    correlationId,
    actor: input.requester,
  });

  if (isAiActor(input.requester)) {
    return buildRecord({
      armingId,
      input,
      ctx,
      correlationId,
      now,
      status: "ARMING_BLOCKED",
      blockers: ["AI_BOUNDARY:REQUEST_FORBIDDEN"],
      checks: [],
    });
  }

  if (isArmingKillSwitched({
    supplierId: ctx.supplier,
    market: input.market || "DE",
    channel: input.channel || "DIRECT",
  })) {
    recordArmingAudit({
      type: "PRODUCTION_ARMING_KILL_SWITCH_BLOCKED",
      armingId,
      supplierId: ctx.supplier,
      correlationId,
      actor: input.requester,
    });
    return buildRecord({
      armingId,
      input,
      ctx,
      correlationId,
      now,
      status: "ARMING_BLOCKED",
      blockers: ["KILL_SWITCH_ACTIVE"],
      checks: [],
    });
  }

  const preflight = runProductionArmingPreflight(input);
  const status = preflight.blockers.length === 0 ? "ARMING_READY" : "ARMING_BLOCKED";

  const record = buildRecord({
    armingId,
    input,
    ctx,
    correlationId,
    now,
    status,
    blockers: preflight.blockers,
    checks: preflight.checks,
    scope: preflight.scope,
    limits: preflight.limits,
    evidence: preflight.evidence,
  });

  saveArmingRecord(record);
  emitArmingAnalytics({
    eventType: status === "ARMING_READY" ? "arming_ready" : "arming_blocked",
    armingId,
    supplierId: ctx.supplier,
    correlationId,
  });

  return record;
}

function buildRecord(params: {
  armingId: string;
  input: ProductionArmingInput;
  ctx: { supplier: string; idempotencyKey: string };
  correlationId: string;
  now: string;
  status: ProductionOrderArmingRecord["status"];
  blockers: string[];
  checks: ProductionOrderArmingRecord["checks"];
  scope?: ProductionOrderArmingRecord["scope"];
  limits?: ProductionOrderArmingRecord["limits"];
  evidence?: ProductionOrderArmingRecord["validationEvidence"];
}): ProductionOrderArmingRecord {
  const expiresAt = new Date(Date.now() + ARMING_TTL_MS).toISOString();
  return {
    armingId: params.armingId,
    supplier: params.ctx.supplier,
    scope: params.scope || {
      supplier: params.ctx.supplier,
      market: params.input.market || "DE",
      channel: params.input.channel || "DIRECT",
      environment: params.input.environment || "PRODUCTION",
      currency: params.input.currency || "EUR",
    },
    limits: params.limits || {
      maximumQuantity: 1,
      maximumOrderValue: 500,
      allowedSupplier: params.ctx.supplier,
      allowedMarket: params.input.market || "DE",
      allowedCurrency: params.input.currency || "EUR",
    },
    validationEvidence: params.evidence || {
      validationId: "none",
      supplier: params.ctx.supplier,
      validationTimestamp: params.now,
      result: "NONE",
      liveValidation: "NONE",
      createOrderCapability: "UNVERIFIED",
      productionValidated: false,
    },
    status: params.status,
    blockerCodes: params.blockers,
    checks: params.checks,
    correlationId: params.correlationId,
    idempotencyKey: params.ctx.idempotencyKey,
    requestedBy: params.input.requester,
    createdAt: params.now,
    updatedAt: params.now,
    expiresAt,
  };
}

export function armProductionOrder(input: {
  armingId: string;
  actorId: string;
  approvalId?: string;
}): { ok: boolean; record?: ProductionOrderArmingRecord; blockers?: string[] } {
  if (isAiActor(input.actorId)) {
    return { ok: false, blockers: ["AI_BOUNDARY:ARM_FORBIDDEN"] };
  }

  try {
    assertArmingNetworkSafety();
  } catch {
    return { ok: false, blockers: ["NETWORK_MUST_REMAIN_DISABLED"] };
  }

  const expiryCheck = assertArmingNotExpired(input.armingId);
  if (expiryCheck.expired) return { ok: false, blockers: ["ARMING_EXPIRED"] };

  const record = expiryCheck.record!;
  if (record.status !== "ARMING_READY" && record.status !== "ARMED") {
    return { ok: false, blockers: ["ARMING_NOT_READY"] };
  }

  const approvalCheck = validateArmingApproval({ armingId: input.armingId, approvalId: input.approvalId });
  if (!approvalCheck.valid) {
    return { ok: false, blockers: approvalCheck.blockers };
  }

  if (isArmingKillSwitched({
    supplierId: record.supplier,
    market: record.scope.market,
    channel: record.scope.channel,
  })) {
    recordArmingAudit({
      type: "PRODUCTION_ARMING_KILL_SWITCH_BLOCKED",
      armingId: record.armingId,
      supplierId: record.supplier,
      correlationId: record.correlationId,
      actor: input.actorId,
    });
    return { ok: false, blockers: ["KILL_SWITCH_ACTIVE"] };
  }

  const preflight = runProductionArmingPreflight({
    supplier: record.supplier,
    market: record.scope.market,
    channel: record.scope.channel,
    environment: record.scope.environment,
    currency: record.scope.currency,
    requester: record.requestedBy,
    correlationId: record.correlationId,
  });
  if (preflight.blockers.length > 0) {
    record.status = "ARMING_BLOCKED";
    record.blockerCodes = preflight.blockers;
    record.updatedAt = new Date().toISOString();
    saveArmingRecord(record);
    return { ok: false, blockers: preflight.blockers };
  }

  record.status = "ARMED";
  record.armedBy = input.actorId;
  record.armedAt = new Date().toISOString();
  record.updatedAt = record.armedAt;
  saveArmingRecord(record);

  recordArmingAudit({
    type: "PRODUCTION_ARMED",
    armingId: record.armingId,
    supplierId: record.supplier,
    correlationId: record.correlationId,
    actor: input.actorId,
    detail: {
      validationId: record.validationEvidence.validationId,
      scope: record.scope,
      limits: record.limits,
    },
  });

  emitArmingAnalytics({
    eventType: "production_armed",
    armingId: record.armingId,
    supplierId: record.supplier,
    correlationId: record.correlationId,
  });

  return { ok: true, record };
}

export { approveProductionOrderArming };

export function attemptProductionOrderExecution(input: {
  armingId: string;
  actorId: string;
  executionId?: string;
  authorizationId?: string;
}): {
  blocked: boolean;
  code: string;
  reason: string;
  httpCallsMade: number;
  armed: boolean;
} {
  assertArmingNetworkSafety();
  recordBlockedProductionExecutionAttempt();

  return attemptFirstOrderExecution344(input);
}
