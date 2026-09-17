import { randomUUID } from "crypto";
import { isAiActor } from "@/lib/supplier-production-order-validation/eligibility";
import { recordObservationAudit } from "./audit";
import {
  getBroaderRolloutByIdempotency,
  getBroaderRolloutRecord,
  getObservationRecord,
  isRolloutActivated,
  markRolloutActivated,
  saveBroaderRolloutRecord,
  saveObservationRecord,
} from "./persistence";
import { validateRolloutApproval, markRolloutApprovalUsed, approveBroaderRollout } from "./approval";
import { assertRolloutNotExpired } from "./expiry";
import { isObservationKillSwitched } from "./killSwitch";
import { assertObservationNetworkSafety } from "./safety";
import { validateRolloutLimits } from "./rolloutLimits";
import { ROLLOUT_ACTIVE_TTL_MS } from "./config";
import { emitObservationAnalytics } from "./analytics";
import type { BroaderRolloutRecord } from "./types";

export { approveBroaderRollout };

export function requestBroaderRolloutApproval(input: {
  observationId: string;
  requester: string;
  idempotencyKey?: string;
}): { ok: boolean; rolloutId?: string; blockers?: string[] } {
  const record = getObservationRecord(input.observationId);
  if (!record || record.state !== "OBSERVATION_REVIEW_READY") {
    return { ok: false, blockers: ["OBSERVATION_NOT_REVIEW_READY"] };
  }

  const rolloutId = record.rolloutId || `roll346_${randomUUID().slice(0, 12)}`;
  record.state = "BROADER_ROLLOUT_APPROVAL_PENDING";
  record.rolloutId = rolloutId;
  record.updatedAt = new Date().toISOString();
  saveObservationRecord(record);

  recordObservationAudit({
    type: "BROADER_ROLLOUT_APPROVAL_REQUESTED",
    observationId: record.observationId,
    rolloutId,
    supplierId: record.supplier,
    correlationId: record.correlationId,
    actor: input.requester,
  });

  return { ok: true, rolloutId };
}

export function activateBroaderRollout(input: {
  observationId: string;
  rolloutId: string;
  actorId: string;
  approvalId?: string;
  idempotencyKey?: string;
}): { ok: boolean; record?: BroaderRolloutRecord; blockers?: string[] } {
  if (isAiActor(input.actorId)) return { ok: false, blockers: ["AI_BOUNDARY:ACTIVATE_FORBIDDEN"] };

  try {
    assertObservationNetworkSafety();
  } catch {
    return { ok: false, blockers: ["NETWORK_MUST_REMAIN_DISABLED"] };
  }

  const idempotencyKey = input.idempotencyKey || `activate_${input.rolloutId}`;
  const existing = getBroaderRolloutByIdempotency(idempotencyKey);
  if (existing) return { ok: true, record: existing };

  if (isRolloutActivated(input.rolloutId)) {
    return { ok: true, record: getBroaderRolloutRecord(input.rolloutId) };
  }

  const observation = getObservationRecord(input.observationId);
  if (!observation) return { ok: false, blockers: ["OBSERVATION_NOT_FOUND"] };

  const approvalCheck = validateRolloutApproval({
    observationId: input.observationId,
    approvalId: input.approvalId,
  });
  if (!approvalCheck.valid) return { ok: false, blockers: approvalCheck.blockers };

  if (observation.state !== "BROADER_ROLLOUT_APPROVED") {
    return { ok: false, blockers: ["BROADER_ROLLOUT_NOT_APPROVED"] };
  }

  const limitsCheck = validateRolloutLimits(observation.limits);
  if (!limitsCheck.valid) return { ok: false, blockers: limitsCheck.blockers };

  if (isObservationKillSwitched({
    supplierId: observation.supplier,
    market: observation.scope.market,
    channel: observation.scope.channel,
  })) {
    observation.state = "KILL_SWITCHED";
    observation.updatedAt = new Date().toISOString();
    saveObservationRecord(observation);
    return { ok: false, blockers: ["KILL_SWITCH_ACTIVE"] };
  }

  const now = new Date().toISOString();
  const rollout: BroaderRolloutRecord = {
    rolloutId: input.rolloutId,
    observationId: input.observationId,
    goLiveId: observation.goLiveId,
    supplier: observation.supplier,
    state: "BROADER_ROLLOUT_ACTIVE",
    scope: observation.scope,
    limits: observation.limits,
    approval: approvalCheck.approval,
    blockerCodes: [],
    correlationId: observation.correlationId,
    idempotencyKey,
    activatedBy: input.actorId,
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(Date.now() + ROLLOUT_ACTIVE_TTL_MS).toISOString(),
    activatedAt: now,
  };

  saveBroaderRolloutRecord(rollout);
  markRolloutActivated(input.rolloutId);
  markRolloutApprovalUsed(approvalCheck.approval!.approvalId);

  observation.state = "BROADER_ROLLOUT_ACTIVE";
  observation.updatedAt = now;
  saveObservationRecord(observation);

  recordObservationAudit({
    type: "BROADER_ROLLOUT_ACTIVATED",
    observationId: observation.observationId,
    rolloutId: rollout.rolloutId,
    supplierId: observation.supplier,
    correlationId: observation.correlationId,
    actor: input.actorId,
    detail: {
      scope: rollout.scope,
      limits: rollout.limits,
      note: "BROADER_ROLLOUT != UNLIMITED_GLOBAL_GO_LIVE",
    },
  });

  emitObservationAnalytics({
    eventType: "broader_rollout_activated",
    observationId: observation.observationId,
    rolloutId: rollout.rolloutId,
    supplierId: observation.supplier,
    correlationId: observation.correlationId,
  });

  return { ok: true, record: rollout };
}
