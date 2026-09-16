import { createHash, randomUUID } from "crypto";
import { getArmingRecord } from "@/lib/supplier-production-order-arming/persistence";
import { isAiActor } from "@/lib/supplier-production-order-validation/eligibility";
import { recordFirstOrderAudit } from "./audit";
import { FIRST_ORDER_APPROVAL_TTL_MS } from "./config";
import { loadOfficialValidationEvidence } from "./evidence";
import {
  getFirstProductionOrderApproval,
  getFirstProductionOrderRecord,
  saveFirstProductionOrderApproval,
  saveFirstProductionOrderRecord,
} from "./persistence";
import type { FirstProductionOrderApproval, FirstProductionOrderPayload } from "./types";

const usedApprovalNonces = new Set<string>();

export function approveFirstProductionOrder(input: {
  executionId: string;
  approverId: string;
  requesterId: string;
  secondaryApproverId?: string;
}): { ok: boolean; approval?: FirstProductionOrderApproval; blockers: string[] } {
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

  const record = getFirstProductionOrderRecord(input.executionId);
  if (!record) blockers.push("EXECUTION_NOT_FOUND");
  if (record && record.requestedBy !== input.requesterId) blockers.push("REQUESTER_MISMATCH");
  if (record && !["FIRST_ORDER_READY", "ELIGIBLE", "APPROVED"].includes(record.state)) {
    blockers.push("FIRST_ORDER_NOT_READY");
  }

  const payload = record?.payload;
  const arming = record ? getArmingRecord(record.armingId) : undefined;
  if (arming && arming.status !== "ARMED") blockers.push("ARMING_NOT_ARMED");

  const { evidence, blockers: evidenceBlockers } = loadOfficialValidationEvidence({
    supplierId: record?.supplier || "",
    market: record?.scope.market || "DE",
    channel: record?.scope.channel || "DIRECT",
    environment: record?.scope.environment || "PRODUCTION",
  });
  blockers.push(...evidenceBlockers);
  if (!evidence) blockers.push("VALIDATION_EVIDENCE_MISSING");

  if (blockers.length > 0) {
    recordFirstOrderAudit({
      type: "FIRST_ORDER_BLOCKED",
      executionId: input.executionId,
      supplierId: record?.supplier,
      correlationId: record?.correlationId || input.executionId,
      actor: input.approverId,
      detail: { blockers },
    });
    return { ok: false, blockers };
  }

  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + FIRST_ORDER_APPROVAL_TTL_MS).toISOString();
  const approval: FirstProductionOrderApproval = {
    approvalId: `fpoappr_${randomUUID().slice(0, 12)}`,
    executionId: input.executionId,
    requesterId: input.requesterId,
    primaryApproverId: input.approverId,
    secondaryApproverId: input.secondaryApproverId,
    scope: record!.scope,
    limits: record!.limits,
    payloadHash: payload!.payloadHash,
    validationEvidence: evidence!,
    armingId: record!.armingId,
    status: "APPROVED",
    createdAt,
    expiresAt,
    scopeHash: createHash("sha256")
      .update(
        JSON.stringify({
          scope: record!.scope,
          limits: record!.limits,
          payloadHash: payload!.payloadHash,
          evidence: evidence!.validationId,
          armingId: record!.armingId,
        }),
      )
      .digest("hex")
      .slice(0, 16),
  };

  saveFirstProductionOrderApproval(approval);
  record!.approval = approval;
  record!.state = "APPROVED";
  record!.updatedAt = createdAt;
  saveFirstProductionOrderRecord(record!);

  recordFirstOrderAudit({
    type: "FIRST_ORDER_APPROVED",
    executionId: input.executionId,
    orderId: record!.orderId,
    supplierId: record!.supplier,
    correlationId: record!.correlationId,
    actor: input.approverId,
    detail: {
      approvalId: approval.approvalId,
      payloadHash: payload!.payloadHash,
      validationId: evidence!.validationId,
      armingId: record!.armingId,
      expiresAt,
    },
  });

  return { ok: true, approval, blockers: [] };
}

export function validateFirstProductionOrderApproval(input: {
  executionId: string;
  approvalId?: string;
  payload: FirstProductionOrderPayload;
}): { valid: boolean; blockers: string[]; approval?: FirstProductionOrderApproval } {
  const blockers: string[] = [];
  const record = getFirstProductionOrderRecord(input.executionId);
  const approval = input.approvalId
    ? getFirstProductionOrderApproval(input.approvalId)
    : record?.approval;

  if (!approval) {
    blockers.push("APPROVAL_MISSING");
    return { valid: false, blockers };
  }
  if (approval.status !== "APPROVED") blockers.push("APPROVAL_NOT_APPROVED");
  if (Date.parse(approval.expiresAt) <= Date.now()) blockers.push("APPROVAL_EXPIRED");
  if (approval.executionId !== input.executionId) blockers.push("APPROVAL_EXECUTION_MISMATCH");
  if (approval.payloadHash !== input.payload.payloadHash) blockers.push("PAYLOAD_HASH_CHANGED");
  if (approval.armingId !== input.payload.armingId) blockers.push("ARMING_ID_MISMATCH");
  if (usedApprovalNonces.has(approval.approvalId)) blockers.push("APPROVAL_REPLAY");

  return { valid: blockers.length === 0, blockers, approval };
}

export function markApprovalUsed(approvalId: string): void {
  usedApprovalNonces.add(approvalId);
}

export function resetApprovalNoncesForTests(): void {
  usedApprovalNonces.clear();
}
