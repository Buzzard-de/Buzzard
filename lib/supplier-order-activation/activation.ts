import { randomUUID } from "crypto";
import { isSupplierOrderNetworkEnabled } from "@/lib/supplier-engine/network";
import { evaluateSupplierOrderReadiness } from "@/lib/supplier-order-readiness/evaluator";
import { computeRiskClassification } from "@/lib/supplier-order-readiness/risk";
import {
  buildActivationIdempotencyKey,
  getInterCarsAdapterProfile,
  resolveActivationConfig,
} from "./config";
import { runActivationPreflight } from "./preflight";
import {
  createActivationApproval,
  getApprovalForActivation,
  rejectActivationApproval,
  validateApprovalForActivation,
} from "./approval";
import { evaluateKillSwitch } from "./killSwitch";
import { evaluateOrderLimits } from "./limits";
import { evaluateActivationRisk } from "./risk";
import { recordActivationAudit } from "./audit";
import { emitActivationAnalytics } from "./analytics";
import { assertActivationNetworkSafety, recordBlockedRealOrderAttempt } from "./safety";
import {
  getActivationByIdempotency,
  getActivationRecord,
  getInflightActivation,
  listActivationRecords,
  saveActivationRecord,
} from "./persistence";
import type {
  ActivationStatus,
  CreateActivationInput,
  NetworkState,
  SupplierOrderActivationRequest,
} from "./types";

function nowIso(): string {
  return new Date().toISOString();
}

function buildActivationId(): string {
  return `soa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isAiActor(actor?: string): boolean {
  if (!actor) return false;
  const lower = actor.toLowerCase();
  return lower.includes("ai_agent") || lower.includes("ai-agent") || lower === "ai";
}

export function createActivationRequest(input: CreateActivationInput): {
  ok: boolean;
  activation?: SupplierOrderActivationRequest;
  blockers?: string[];
  preflight?: ReturnType<typeof runActivationPreflight>;
} {
  if (isAiActor(input.requester)) {
    return { ok: false, blockers: ["AI_BOUNDARY:REQUEST_FORBIDDEN"] };
  }

  const cfg = resolveActivationConfig();
  const supplierId = input.supplierId || cfg.interCarsSupplierId;
  const market = input.market || "DE";
  const channel = input.channel || "DIRECT";
  const environment = input.environment || "PRODUCTION";
  const correlationId = input.correlationId || randomUUID();
  const idempotencyKey =
    input.idempotencyKey ||
    buildActivationIdempotencyKey({ supplierId, market, channel, environment, requester: input.requester });

  const existing = getActivationByIdempotency(idempotencyKey);
  if (existing) {
    return { ok: true, activation: existing };
  }

  const inflight = getInflightActivation(idempotencyKey);
  if (inflight) {
    throw new Error("ACTIVATION_INFLIGHT");
  }

  recordActivationAudit({
    type: "PREFLIGHT_STARTED",
    supplierId,
    correlationId,
    actor: input.requester,
  });

  const preflight = runActivationPreflight({
    supplierId,
    market,
    channel,
    environment,
    requester: input.requester,
    correlationId,
    orderValue: input.maxOrderValue,
    rehearsalId: input.rehearsalId,
  });

  emitActivationAnalytics({
    eventType: "activation_preflight",
    supplierId,
    correlationId,
    detail: { blockers: preflight.blockers },
  });

  const readiness = evaluateSupplierOrderReadiness(
    { supplierId, market, channel, environment: environment === "STAGING" ? "SANDBOX" : environment },
    { correlationId, force: true },
  );
  const riskLevel = computeRiskClassification(
    { supplierId, market, channel, environment: environment === "STAGING" ? "SANDBOX" : environment },
    readiness.checks.map((c) => ({
      code: c.code,
      category: c.category,
      level: c.level === "CRITICAL" ? "CRITICAL" : c.level,
      message: c.message,
      blocking: c.blocking,
    })),
  );

  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + cfg.activationTtlMs).toISOString();
  const status: ActivationStatus =
    preflight.blockers.length > 0 ? "BLOCKED" : "PENDING_APPROVAL";

  const activation: SupplierOrderActivationRequest = {
    activationId: buildActivationId(),
    supplierId,
    adapterProfile: getInterCarsAdapterProfile(),
    environment,
    market,
    channel,
    requestedBy: input.requester,
    orderScope: input.orderScope,
    customerScope: input.customerScope,
    maxOrderValue: input.maxOrderValue ?? cfg.defaultMaxOrderValue,
    maxDailyOrderValue: input.maxDailyOrderValue ?? cfg.defaultMaxDailyOrderValue,
    maxOrders: input.maxOrders ?? cfg.defaultMaxOrders,
    riskLevel: riskLevel === "BLOCKED" ? "HIGH" : (riskLevel as SupplierOrderActivationRequest["riskLevel"]),
    readinessId: preflight.readinessId,
    validationId: preflight.validationId,
    rehearsalId: preflight.rehearsalId,
    killSwitchState: evaluateKillSwitch({
      activationId: "",
      supplierId,
      adapterProfile: getInterCarsAdapterProfile(),
      environment,
      market,
      channel,
      requestedBy: input.requester,
      networkState: "DISABLED",
      realOrderSent: false,
      status: "DRAFT",
      correlationId,
      idempotencyKey,
      riskLevel: "LOW",
      createdAt,
      updatedAt: createdAt,
    }).state,
    networkState: "DISABLED",
    realOrderSent: false,
    status,
    reason: preflight.blockers.length ? preflight.blockers.join(",") : undefined,
    correlationId,
    idempotencyKey,
    preflightChecks: preflight.checks,
    createdAt,
    updatedAt: createdAt,
    expiresAt,
  };

  saveActivationRecord(activation);

  recordActivationAudit({
    type: preflight.blockers.length ? "ACTIVATION_BLOCKED" : "ACTIVATION_CREATED",
    activationId: activation.activationId,
    supplierId,
    correlationId,
    actor: input.requester,
    detail: { status, blockers: preflight.blockers },
  });

  emitActivationAnalytics({
    eventType: "activation_requested",
    activationId: activation.activationId,
    supplierId,
    correlationId,
    detail: { status },
  });

  return {
    ok: preflight.blockers.length === 0,
    activation,
    blockers: preflight.blockers,
    preflight,
  };
}

export function approveActivationRequest(input: {
  activationId: string;
  approverId: string;
}): ReturnType<typeof createActivationApproval> {
  if (isAiActor(input.approverId)) {
    return { ok: false, blockers: ["AI_BOUNDARY:APPROVE_FORBIDDEN"] };
  }

  const activation = getActivationRecord(input.activationId);
  if (!activation) return { ok: false, blockers: ["ACTIVATION_NOT_FOUND"] };
  if (activation.status === "BLOCKED") return { ok: false, blockers: ["ACTIVATION_BLOCKED"] };

  const result = createActivationApproval({
    activationId: input.activationId,
    approverId: input.approverId,
    requesterId: activation.requestedBy,
    scope: {
      supplierId: activation.supplierId,
      adapterProfile: activation.adapterProfile,
      environment: activation.environment,
      market: activation.market,
      channel: activation.channel,
      maxOrderValue: activation.maxOrderValue ?? resolveActivationConfig().defaultMaxOrderValue,
      maxDailyOrderValue: activation.maxDailyOrderValue ?? resolveActivationConfig().defaultMaxDailyOrderValue,
      maxOrders: activation.maxOrders ?? resolveActivationConfig().defaultMaxOrders,
      riskLevel: activation.riskLevel,
    },
  });

  if (result.ok) {
    emitActivationAnalytics({
      eventType: "activation_approved",
      activationId: activation.activationId,
      supplierId: activation.supplierId,
      correlationId: activation.correlationId,
    });
  }

  return result;
}

export function rejectActivationRequest(input: {
  activationId: string;
  approverId: string;
  reason: string;
}): ReturnType<typeof rejectActivationApproval> {
  if (isAiActor(input.approverId)) {
    return { ok: false, blockers: ["AI_BOUNDARY:REJECT_FORBIDDEN"] };
  }
  return rejectActivationApproval(input);
}

export function armActivation(input: {
  activationId: string;
  actorId: string;
}): {
  ok: boolean;
  activation?: SupplierOrderActivationRequest;
  blockers?: string[];
} {
  if (isAiActor(input.actorId)) {
    return { ok: false, blockers: ["AI_BOUNDARY:ARM_FORBIDDEN"] };
  }

  try {
    assertActivationNetworkSafety();
  } catch {
    return { ok: false, blockers: ["NETWORK_MUST_REMAIN_DISABLED"] };
  }

  const activation = getActivationRecord(input.activationId);
  if (!activation) return { ok: false, blockers: ["ACTIVATION_NOT_FOUND"] };

  const preflight = runActivationPreflight({
    supplierId: activation.supplierId,
    market: activation.market,
    channel: activation.channel,
    environment: activation.environment,
    requester: activation.requestedBy,
    correlationId: activation.correlationId,
    orderValue: activation.maxOrderValue,
    rehearsalId: activation.rehearsalId,
  });
  if (preflight.blockers.length > 0) {
    activation.status = "BLOCKED";
    activation.reason = preflight.blockers.join(",");
    activation.updatedAt = nowIso();
    saveActivationRecord(activation);
    return { ok: false, blockers: preflight.blockers };
  }

  const approval = getApprovalForActivation(activation.activationId);
  const approvalCheck = validateApprovalForActivation(activation, approval);
  if (!approvalCheck.valid) {
    return { ok: false, blockers: approvalCheck.blockers };
  }

  const kill = evaluateKillSwitch(activation);
  if (kill.blocked) return { ok: false, blockers: kill.blockers };

  const risk = evaluateActivationRisk(activation);
  if (!risk.allowed) return { ok: false, blockers: risk.blockers };

  activation.networkState = "ARMED";
  activation.status = "APPROVED";
  activation.updatedAt = nowIso();
  saveActivationRecord(activation);

  recordActivationAudit({
    type: "ACTIVATION_ARMED",
    activationId: activation.activationId,
    supplierId: activation.supplierId,
    correlationId: activation.correlationId,
    actor: input.actorId,
  });

  emitActivationAnalytics({
    eventType: "activation_armed",
    activationId: activation.activationId,
    supplierId: activation.supplierId,
    correlationId: activation.correlationId,
  });

  return { ok: true, activation };
}

export function confirmActivation(input: {
  activationId: string;
  actorId: string;
  approvalId: string;
  confirmationNonce: string;
  idempotencyKey: string;
}): {
  ok: boolean;
  activation?: SupplierOrderActivationRequest;
  blockers?: string[];
  code?: string;
} {
  if (isAiActor(input.actorId)) {
    return { ok: false, blockers: ["AI_BOUNDARY:CONFIRM_FORBIDDEN"] };
  }

  const activation = getActivationRecord(input.activationId);
  if (!activation) return { ok: false, blockers: ["ACTIVATION_NOT_FOUND"] };
  if (input.approvalId !== activation.approvalId) {
    return { ok: false, blockers: ["APPROVAL_ID_MISMATCH"] };
  }
  if (input.actorId === activation.requestedBy) {
    return { ok: false, blockers: ["SELF_APPROVAL_FORBIDDEN"] };
  }
  if (!input.confirmationNonce || input.confirmationNonce.length < 8) {
    return { ok: false, blockers: ["CONFIRMATION_NONCE_REQUIRED"] };
  }

  const enableAttempt = executeRealSupplierOrder({
    activationId: activation.activationId,
    actorId: input.actorId,
    humanConfirmation: true,
    confirmationNonce: input.confirmationNonce,
    idempotencyKey: input.idempotencyKey,
  });

  if (enableAttempt.blocked) {
    return {
      ok: false,
      blockers: [enableAttempt.code],
      code: enableAttempt.code,
      activation,
    };
  }

  activation.networkState = "ENABLED";
  activation.status = "ACTIVE";
  activation.confirmationNonce = input.confirmationNonce;
  activation.updatedAt = nowIso();
  saveActivationRecord(activation);
  return { ok: true, activation };
}

export function revokeActivation(input: {
  activationId: string;
  actorId: string;
  reason: string;
}): { ok: boolean; activation?: SupplierOrderActivationRequest } {
  const activation = getActivationRecord(input.activationId);
  if (!activation) return { ok: false };

  activation.status = "REVOKED";
  activation.networkState = "DISABLED";
  activation.reason = input.reason;
  activation.updatedAt = nowIso();
  saveActivationRecord(activation);

  recordActivationAudit({
    type: "ACTIVATION_REVOKED",
    activationId: activation.activationId,
    supplierId: activation.supplierId,
    correlationId: activation.correlationId,
    actor: input.actorId,
    detail: { reason: input.reason },
  });

  emitActivationAnalytics({
    eventType: "activation_revoked",
    activationId: activation.activationId,
    supplierId: activation.supplierId,
    correlationId: activation.correlationId,
  });

  return { ok: true, activation };
}

export function cancelActivation(input: {
  activationId: string;
  actorId: string;
  reason?: string;
}): { ok: boolean; activation?: SupplierOrderActivationRequest } {
  const activation = getActivationRecord(input.activationId);
  if (!activation) return { ok: false };

  activation.status = "CANCELLED";
  activation.networkState = "DISABLED";
  activation.reason = input.reason;
  activation.updatedAt = nowIso();
  saveActivationRecord(activation);
  return { ok: true, activation };
}

export function executeRealSupplierOrder(input: {
  activationId: string;
  actorId: string;
  humanConfirmation?: boolean;
  confirmationNonce?: string;
  idempotencyKey?: string;
  orderValue?: number;
  payloadHash?: string;
  inventoryReservationId?: string;
}): {
  ok: false;
  blocked: true;
  code: string;
  reason: string;
  guards: Record<string, boolean>;
  httpCallsMade: number;
} {
  const guards: Record<string, boolean> = {};
  const activation = getActivationRecord(input.activationId);

  try {
    assertActivationNetworkSafety();
    guards.networkEnvDisabled = true;
  } catch {
    guards.networkEnvDisabled = false;
  }

  guards.networkEnabled = isSupplierOrderNetworkEnabled();
  guards.productionEnvironment = activation?.environment === "PRODUCTION";
  guards.supplierEnabled = Boolean(activation?.supplierId);
  guards.readinessReady = activation?.readinessId != null;
  guards.validationReady = activation?.validationId != null;
  guards.createOrderValidated = false;
  guards.approvalApproved = activation?.status === "APPROVED" || activation?.status === "ACTIVE";
  guards.approvalNotExpired = activation?.expiresAt ? Date.parse(activation.expiresAt) > Date.now() : false;
  guards.requesterNotApprover =
    Boolean(activation) && input.actorId !== activation?.requestedBy;
  guards.riskAllowed = activation ? evaluateActivationRisk(activation).allowed : false;
  guards.limitsAllowed = activation
    ? evaluateOrderLimits({
        activation,
        orderValue: input.orderValue ?? activation.maxOrderValue ?? 0,
        isFirstOrder: true,
      }).allowed
    : false;
  guards.killSwitchOff = activation ? !evaluateKillSwitch(activation).blocked : false;
  guards.payloadHashValid = Boolean(input.payloadHash);
  guards.inventoryReservationValid = Boolean(input.inventoryReservationId);
  guards.idempotencyValid = Boolean(input.idempotencyKey);
  guards.securityValid = !isAiActor(input.actorId);
  guards.humanConfirmation = Boolean(input.humanConfirmation && input.confirmationNonce);

  recordActivationAudit({
    type: "REAL_ORDER_ATTEMPT_BLOCKED",
    activationId: input.activationId,
    supplierId: activation?.supplierId,
    correlationId: activation?.correlationId || randomUUID(),
    actor: input.actorId,
    detail: { guards, code: "REAL_ORDER_ENDPOINT_NOT_VALIDATED" },
  });

  emitActivationAnalytics({
    eventType: "first_order_blocked",
    activationId: input.activationId,
    supplierId: activation?.supplierId,
    correlationId: activation?.correlationId || randomUUID(),
    detail: { code: "REAL_ORDER_ENDPOINT_NOT_VALIDATED" },
  });

  recordBlockedRealOrderAttempt();

  return {
    ok: false,
    blocked: true,
    code: "REAL_ORDER_ENDPOINT_NOT_VALIDATED",
    reason: "Inter Cars createOrder capability is UNVERIFIED — no real HTTP call permitted",
    guards,
    httpCallsMade: 0,
  };
}

export function listActivations(filter?: {
  supplierId?: string;
  status?: ActivationStatus;
}): SupplierOrderActivationRequest[] {
  return listActivationRecords().filter((row) => {
    if (filter?.supplierId && row.supplierId !== filter.supplierId) return false;
    if (filter?.status && row.status !== filter.status) return false;
    return true;
  });
}

export function getActivationDetail(activationId: string): SupplierOrderActivationRequest | undefined {
  return getActivationRecord(activationId);
}
