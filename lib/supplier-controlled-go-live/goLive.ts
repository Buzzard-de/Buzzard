import { randomUUID } from "crypto";
import { isAiActor } from "@/lib/supplier-production-order-validation/eligibility";
import { recordGoLiveAudit } from "./audit";
import { validateGoLiveApproval, markGoLiveApprovalUsed } from "./approval";
import { assertGoLiveNotExpired } from "./expiry";
import { isGoLiveKillSwitched } from "./killSwitch";
import {
  getControlledGoLiveByIdempotency,
  getControlledGoLiveRecord,
  isGoLiveActivated,
  markGoLiveActivated,
  saveControlledGoLiveRecord,
} from "./persistence";
import { evaluateGoLiveEligibility } from "./eligibility";
import { assertGoLiveNetworkSafety } from "./safety";
import { emitGoLiveAnalytics } from "./analytics";
import {
  GO_LIVE_TTL_MS,
  GO_LIVE_ROLLOUT_TTL_MS,
  buildGoLiveIdempotencyKey,
  getInterCarsSupplierId,
  resolveGoLiveLimits,
} from "./config";
import type { ControlledGoLiveRecord, GoLiveScope } from "./types";
import { loadOfficialValidationEvidence } from "@/lib/supplier-production-order-arming/evidence";
import { loadFirstOrderEvidence } from "./firstOrderValidation";

export function requestGoLiveReview(input: {
  requester: string;
  supplier?: string;
  market?: string;
  channel?: import("@/lib/supplier-order-readiness/types").ReadinessChannel;
  executionId?: string;
  correlationId?: string;
  idempotencyKey?: string;
  mockReview?: boolean;
}): ControlledGoLiveRecord {
  assertGoLiveNetworkSafety();

  const supplier = input.supplier || getInterCarsSupplierId();
  const market = input.market || "DE";
  const channel = input.channel || "DIRECT";
  const idempotencyKey =
    input.idempotencyKey || buildGoLiveIdempotencyKey({ supplier, market, channel, requester: input.requester });

  const existing = getControlledGoLiveByIdempotency(idempotencyKey);
  if (existing) return existing;

  const correlationId = input.correlationId || randomUUID();
  const goLiveId = `cgl345_${randomUUID().slice(0, 12)}`;
  const now = new Date().toISOString();

  recordGoLiveAudit({
    type: "GO_LIVE_REVIEW_REQUESTED",
    goLiveId,
    supplierId: supplier,
    correlationId,
    actor: input.requester,
  });

  if (isAiActor(input.requester)) {
    return buildBlockedRecord({
      goLiveId,
      supplier,
      market,
      channel,
      input,
      idempotencyKey,
      correlationId,
      now,
      blockers: ["AI_BOUNDARY:REQUEST_FORBIDDEN"],
      checks: [],
    });
  }

  recordGoLiveAudit({
    type: "GO_LIVE_REVIEW_STARTED",
    goLiveId,
    supplierId: supplier,
    correlationId,
    actor: input.requester,
  });

  const eligibility = evaluateGoLiveEligibility({
    supplierId: supplier,
    market,
    channel,
    environment: "PRODUCTION",
    requester: input.requester,
    executionId: input.executionId,
    mockReview: input.mockReview,
  });

  const { evidence: validationEvidence } = loadOfficialValidationEvidence({
    supplierId: supplier,
    market,
    channel,
    environment: "PRODUCTION",
  });
  const firstOrder = loadFirstOrderEvidence({ executionId: input.executionId, supplierId: supplier, market, channel });

  let state: ControlledGoLiveRecord["state"] = "BLOCKED";
  if (firstOrder.evidence?.executionResult === "UNKNOWN_OUTCOME") {
    state = "UNKNOWN_OUTCOME";
  } else if (eligibility.blockers.length === 0) {
    state = "GO_LIVE_REVIEW_READY";
    recordGoLiveAudit({
      type: "FIRST_ORDER_VALIDATED",
      goLiveId,
      supplierId: supplier,
      correlationId,
      actor: input.requester,
      detail: { executionId: firstOrder.evidence?.executionId },
    });
  } else if (firstOrder.evidence?.executionResult === "EXECUTED") {
    state = "POST_ORDER_VALIDATION";
  } else {
    recordGoLiveAudit({
      type: firstOrder.blockers.length ? "FIRST_ORDER_VALIDATION_FAILED" : "GO_LIVE_BLOCKED",
      goLiveId,
      supplierId: supplier,
      correlationId,
      actor: input.requester,
      detail: { blockers: eligibility.blockers },
    });
  }

  const scope: GoLiveScope = {
    supplier,
    market,
    channel,
    environment: "PRODUCTION",
    currency: "EUR",
    allowedCategories: resolveGoLiveLimits().allowedCategories,
  };

  const record: ControlledGoLiveRecord = {
    goLiveId,
    supplier,
    state,
    scope,
    limits: resolveGoLiveLimits(),
    firstOrderEvidence: firstOrder.evidence,
    validationEvidence: validationEvidence,
    checks: eligibility.checks,
    blockerCodes: eligibility.blockers,
    correlationId,
    idempotencyKey,
    requestedBy: input.requester,
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(Date.now() + GO_LIVE_TTL_MS).toISOString(),
  };

  saveControlledGoLiveRecord(record);
  emitGoLiveAnalytics({
    eventType: state === "GO_LIVE_REVIEW_READY" ? "go_live_review_ready" : "go_live_blocked",
    goLiveId,
    supplierId: supplier,
    correlationId,
  });

  return record;
}

function buildBlockedRecord(params: {
  goLiveId: string;
  supplier: string;
  market: string;
  channel: import("@/lib/supplier-order-readiness/types").ReadinessChannel;
  input: { requester: string };
  idempotencyKey: string;
  correlationId: string;
  now: string;
  blockers: string[];
  checks: ControlledGoLiveRecord["checks"];
}): ControlledGoLiveRecord {
  const record: ControlledGoLiveRecord = {
    goLiveId: params.goLiveId,
    supplier: params.supplier,
    state: "BLOCKED",
    scope: {
      supplier: params.supplier,
      market: params.market,
      channel: params.channel,
      environment: "PRODUCTION",
      currency: "EUR",
    },
    limits: resolveGoLiveLimits(),
    checks: params.checks,
    blockerCodes: params.blockers,
    correlationId: params.correlationId,
    idempotencyKey: params.idempotencyKey,
    requestedBy: params.input.requester,
    createdAt: params.now,
    updatedAt: params.now,
    expiresAt: new Date(Date.now() + GO_LIVE_TTL_MS).toISOString(),
  };
  saveControlledGoLiveRecord(record);
  return record;
}

export function activateControlledGoLive(input: {
  goLiveId: string;
  actorId: string;
  approvalId?: string;
}): { ok: boolean; record?: ControlledGoLiveRecord; blockers?: string[] } {
  if (isAiActor(input.actorId)) return { ok: false, blockers: ["AI_BOUNDARY:ACTIVATE_FORBIDDEN"] };

  try {
    assertGoLiveNetworkSafety();
  } catch {
    return { ok: false, blockers: ["NETWORK_MUST_REMAIN_DISABLED"] };
  }

  if (isGoLiveActivated(input.goLiveId)) {
    return { ok: true, record: getControlledGoLiveRecord(input.goLiveId) };
  }

  const expiryCheck = assertGoLiveNotExpired(input.goLiveId);
  if (expiryCheck.expired || !expiryCheck.record) {
    return { ok: false, blockers: ["GO_LIVE_EXPIRED"] };
  }

  const record = expiryCheck.record;
  const approvalCheck = validateGoLiveApproval({ goLiveId: input.goLiveId, approvalId: input.approvalId });
  if (!approvalCheck.valid) return { ok: false, blockers: approvalCheck.blockers };

  if (record.state !== "HUMAN_APPROVAL" && record.state !== "GO_LIVE_REVIEW_READY") {
    return { ok: false, blockers: ["GO_LIVE_NOT_APPROVED"] };
  }

  if (isGoLiveKillSwitched({ supplierId: record.supplier, market: record.scope.market, channel: record.scope.channel })) {
    record.state = "KILL_SWITCHED";
    record.updatedAt = new Date().toISOString();
    saveControlledGoLiveRecord(record);
    return { ok: false, blockers: ["KILL_SWITCH_ACTIVE"] };
  }

  const revalidation = evaluateGoLiveEligibility({
    supplierId: record.supplier,
    market: record.scope.market,
    channel: record.scope.channel,
    environment: record.scope.environment,
    requester: record.requestedBy,
    executionId: record.firstOrderEvidence?.executionId,
    mockReview: record.firstOrderEvidence?.mockExecution,
  });
  if (revalidation.blockers.length > 0) {
    record.state = "VALIDATION_FAILED";
    record.blockerCodes = revalidation.blockers;
    record.updatedAt = new Date().toISOString();
    saveControlledGoLiveRecord(record);
    return { ok: false, blockers: revalidation.blockers };
  }

  record.state = "CONTROLLED_GO_LIVE";
  record.activatedAt = new Date().toISOString();
  record.expiresAt = new Date(Date.now() + GO_LIVE_ROLLOUT_TTL_MS).toISOString();
  record.updatedAt = record.activatedAt;
  saveControlledGoLiveRecord(record);
  markGoLiveActivated(record.goLiveId);
  markGoLiveApprovalUsed(approvalCheck.approval!.approvalId);

  recordGoLiveAudit({
    type: "CONTROLLED_GO_LIVE_ACTIVATED",
    goLiveId: record.goLiveId,
    supplierId: record.supplier,
    correlationId: record.correlationId,
    actor: input.actorId,
    detail: {
      scope: record.scope,
      limits: record.limits,
      expiresAt: record.expiresAt,
      note: "CONTROLLED_GO_LIVE != FULL_GLOBAL_GO_LIVE",
    },
  });

  emitGoLiveAnalytics({
    eventType: "controlled_go_live_activated",
    goLiveId: record.goLiveId,
    supplierId: record.supplier,
    correlationId: record.correlationId,
  });

  return { ok: true, record };
}

export { approveControlledGoLive } from "./approval";
