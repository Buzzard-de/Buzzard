import { createHash, randomUUID } from "crypto";
import { isAiActor } from "@/lib/supplier-production-order-validation/eligibility";
import { recordGoLiveAudit } from "./audit";
import { GO_LIVE_APPROVAL_TTL_MS } from "./config";
import {
  getControlledGoLiveRecord,
  getGoLiveApproval,
  saveGoLiveApproval,
  saveControlledGoLiveRecord,
} from "./persistence";
import type { GoLiveApproval, GoLiveLimits, GoLiveScope, FirstOrderEvidence } from "./types";
import type { ValidationEvidence } from "@/lib/supplier-production-order-arming/types";

const usedApprovalIds = new Set<string>();

export function approveControlledGoLive(input: {
  goLiveId: string;
  approverId: string;
  requesterId: string;
  secondaryApproverId?: string;
}): { ok: boolean; approval?: GoLiveApproval; blockers: string[] } {
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

  const record = getControlledGoLiveRecord(input.goLiveId);
  if (!record) blockers.push("GO_LIVE_NOT_FOUND");
  if (record && record.state !== "GO_LIVE_REVIEW_READY" && record.state !== "HUMAN_APPROVAL") {
    blockers.push("GO_LIVE_NOT_REVIEW_READY");
  }
  if (record && record.requestedBy !== input.requesterId) blockers.push("REQUESTER_MISMATCH");

  if (blockers.length > 0) {
    recordGoLiveAudit({
      type: "GO_LIVE_BLOCKED",
      goLiveId: input.goLiveId,
      supplierId: record?.supplier,
      correlationId: record?.correlationId || input.goLiveId,
      actor: input.approverId,
      detail: { blockers },
    });
    return { ok: false, blockers };
  }

  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + GO_LIVE_APPROVAL_TTL_MS).toISOString();
  const approval: GoLiveApproval = {
    approvalId: `cglappr_${randomUUID().slice(0, 12)}`,
    goLiveId: input.goLiveId,
    requesterId: input.requesterId,
    primaryApproverId: input.approverId,
    secondaryApproverId: input.secondaryApproverId,
    scope: record!.scope,
    limits: record!.limits,
    firstOrderEvidence: record!.firstOrderEvidence!,
    validationEvidence: record!.validationEvidence!,
    status: "APPROVED",
    createdAt,
    expiresAt,
    scopeHash: createHash("sha256")
      .update(
        JSON.stringify({
          scope: record!.scope,
          limits: record!.limits,
          firstOrder: record!.firstOrderEvidence!.executionId,
          validation: record!.validationEvidence!.validationId,
        }),
      )
      .digest("hex")
      .slice(0, 16),
  };

  saveGoLiveApproval(approval);
  record!.approval = approval;
  record!.state = "HUMAN_APPROVAL";
  record!.updatedAt = createdAt;
  saveControlledGoLiveRecord(record!);

  recordGoLiveAudit({
    type: "GO_LIVE_APPROVED",
    goLiveId: record!.goLiveId,
    supplierId: record!.supplier,
    correlationId: record!.correlationId,
    actor: input.approverId,
    detail: { approvalId: approval.approvalId, expiresAt },
  });

  return { ok: true, approval, blockers: [] };
}

export function validateGoLiveApproval(input: {
  goLiveId: string;
  approvalId?: string;
}): { valid: boolean; blockers: string[]; approval?: GoLiveApproval } {
  const blockers: string[] = [];
  const record = getControlledGoLiveRecord(input.goLiveId);
  const approval = input.approvalId ? getGoLiveApproval(input.approvalId) : record?.approval;

  if (!approval) {
    blockers.push("APPROVAL_MISSING");
    return { valid: false, blockers };
  }
  if (approval.status !== "APPROVED") blockers.push("APPROVAL_NOT_APPROVED");
  if (Date.parse(approval.expiresAt) <= Date.now()) blockers.push("APPROVAL_EXPIRED");
  if (approval.goLiveId !== input.goLiveId) blockers.push("APPROVAL_MISMATCH");
  if (usedApprovalIds.has(approval.approvalId)) blockers.push("APPROVAL_REPLAY");

  return { valid: blockers.length === 0, blockers, approval };
}

export function markGoLiveApprovalUsed(approvalId: string): void {
  usedApprovalIds.add(approvalId);
}

export function resetGoLiveApprovalForTests(): void {
  usedApprovalIds.clear();
}
