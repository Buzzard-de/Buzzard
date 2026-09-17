import { createHash, randomUUID } from "crypto";
import { isAiActor } from "@/lib/supplier-production-order-validation/eligibility";
import { recordObservationAudit } from "./audit";
import { ROLLOUT_APPROVAL_TTL_MS } from "./config";
import {
  getObservationRecord,
  getRolloutApproval,
  saveObservationRecord,
  saveRolloutApproval,
} from "./persistence";
import { buildScopeHash } from "./scope";
import type { RolloutApproval } from "./types";

const usedApprovalIds = new Set<string>();

export function approveBroaderRollout(input: {
  observationId: string;
  rolloutId: string;
  approverId: string;
  requesterId: string;
  secondaryApproverId?: string;
}): { ok: boolean; approval?: RolloutApproval; blockers: string[] } {
  const blockers: string[] = [];

  if (isAiActor(input.approverId)) blockers.push("AI_BOUNDARY:APPROVE_FORBIDDEN");
  if (isAiActor(input.secondaryApproverId)) blockers.push("AI_BOUNDARY:SECONDARY_APPROVE_FORBIDDEN");
  if (input.approverId === input.requesterId) blockers.push("SELF_APPROVAL_FORBIDDEN");
  if (input.secondaryApproverId && input.secondaryApproverId === input.approverId) {
    blockers.push("SAME_ACTOR_SECOND_APPROVAL");
  }
  if (input.secondaryApproverId && input.secondaryApproverId === input.requesterId) {
    blockers.push("REQUESTER_SECOND_APPROVAL");
  }

  const record = getObservationRecord(input.observationId);
  if (!record) blockers.push("OBSERVATION_NOT_FOUND");
  if (record && record.state !== "OBSERVATION_REVIEW_READY" && record.state !== "BROADER_ROLLOUT_APPROVAL_PENDING") {
    blockers.push("OBSERVATION_NOT_REVIEW_READY");
  }
  if (record && record.requestedBy !== input.requesterId) blockers.push("REQUESTER_MISMATCH");

  if (blockers.length > 0) {
    recordObservationAudit({
      type: "OBSERVATION_REVIEW_BLOCKED",
      observationId: input.observationId,
      supplierId: record?.supplier,
      correlationId: record?.correlationId || input.observationId,
      actor: input.approverId,
      detail: { blockers },
    });
    return { ok: false, blockers };
  }

  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + ROLLOUT_APPROVAL_TTL_MS).toISOString();
  const approval: RolloutApproval = {
    approvalId: `rollappr_${randomUUID().slice(0, 12)}`,
    observationId: input.observationId,
    rolloutId: input.rolloutId,
    requesterId: input.requesterId,
    primaryApproverId: input.approverId,
    secondaryApproverId: input.secondaryApproverId,
    scope: record!.scope,
    limits: record!.limits,
    metrics: record!.metrics,
    scopeHash: buildScopeHash(record!.scope, record!.limits),
    status: "APPROVED",
    createdAt,
    expiresAt,
  };

  saveRolloutApproval(approval);
  record!.approval = approval;
  record!.state = "BROADER_ROLLOUT_APPROVED";
  record!.rolloutId = input.rolloutId;
  record!.updatedAt = createdAt;
  saveObservationRecord(record!);

  recordObservationAudit({
    type: "BROADER_ROLLOUT_APPROVED",
    observationId: record!.observationId,
    rolloutId: input.rolloutId,
    supplierId: record!.supplier,
    correlationId: record!.correlationId,
    actor: input.approverId,
    detail: { approvalId: approval.approvalId, expiresAt },
  });

  return { ok: true, approval, blockers: [] };
}

export function validateRolloutApproval(input: {
  observationId: string;
  approvalId?: string;
}): { valid: boolean; blockers: string[]; approval?: RolloutApproval } {
  const blockers: string[] = [];
  const record = getObservationRecord(input.observationId);
  const approval = input.approvalId ? getRolloutApproval(input.approvalId) : record?.approval;

  if (!approval) {
    blockers.push("APPROVAL_MISSING");
    return { valid: false, blockers };
  }
  if (approval.status !== "APPROVED") blockers.push("APPROVAL_NOT_APPROVED");
  if (approval.status === "INVALIDATED") blockers.push("APPROVAL_INVALIDATED");
  if (Date.parse(approval.expiresAt) <= Date.now()) blockers.push("APPROVAL_EXPIRED");
  if (approval.observationId !== input.observationId) blockers.push("APPROVAL_MISMATCH");
  if (usedApprovalIds.has(approval.approvalId)) blockers.push("APPROVAL_REPLAY");
  if (record && approval.scopeHash !== buildScopeHash(record.scope, record.limits)) {
    blockers.push("SCOPE_CHANGED");
  }

  return { valid: blockers.length === 0, blockers, approval };
}

export function markRolloutApprovalUsed(approvalId: string): void {
  usedApprovalIds.add(approvalId);
}

export function invalidateRolloutApproval(observationId: string, reason: string): void {
  const record = getObservationRecord(observationId);
  if (!record?.approval) return;
  record.approval.status = "INVALIDATED";
  saveRolloutApproval(record.approval);
  recordObservationAudit({
    type: "SCOPE_CHANGE_APPROVAL_INVALIDATED",
    observationId,
    supplierId: record.supplier,
    correlationId: record.correlationId,
    detail: { reason },
  });
}

export function resetRolloutApprovalForTests(): void {
  usedApprovalIds.clear();
}
