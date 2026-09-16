import { createHash, randomUUID } from "crypto";
import { ARMING_APPROVAL_TTL_MS } from "./config";
import { recordArmingAudit } from "./audit";
import { getArmingRecord, getArmingApproval, saveArmingApproval, saveArmingRecord } from "./persistence";
import { loadOfficialValidationEvidence } from "./evidence";
import { isAiActor } from "@/lib/supplier-production-order-validation/eligibility";
import type { ProductionArmingApproval, ProductionArmingLimits, ProductionArmingScope, ValidationEvidence } from "./types";

export function approveProductionOrderArming(input: {
  armingId: string;
  approverId: string;
  requesterId: string;
  scope: ProductionArmingScope;
  limits: ProductionArmingLimits;
}): { ok: boolean; approval?: ProductionArmingApproval; blockers: string[] } {
  const blockers: string[] = [];

  if (isAiActor(input.approverId)) blockers.push("AI_BOUNDARY:APPROVE_FORBIDDEN");
  if (input.approverId === input.requesterId) blockers.push("SELF_APPROVAL_FORBIDDEN");

  const record = getArmingRecord(input.armingId);
  if (!record) blockers.push("ARMING_NOT_FOUND");
  if (record && record.requestedBy !== input.requesterId) blockers.push("REQUESTER_MISMATCH");
  if (record && record.status !== "ARMING_READY") blockers.push("ARMING_NOT_READY");

  const { evidence, blockers: evidenceBlockers } = loadOfficialValidationEvidence({
    supplierId: input.scope.supplier,
    market: input.scope.market,
    channel: input.scope.channel,
    environment: input.scope.environment,
  });
  blockers.push(...evidenceBlockers);
  if (!evidence) blockers.push("VALIDATION_EVIDENCE_MISSING");

  if (blockers.length > 0) {
    recordArmingAudit({
      type: "PRODUCTION_ARMING_REJECTED",
      armingId: input.armingId,
      supplierId: input.scope.supplier,
      correlationId: record?.correlationId || input.armingId,
      actor: input.approverId,
      detail: { blockers },
    });
    return { ok: false, blockers };
  }

  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + ARMING_APPROVAL_TTL_MS).toISOString();
  const approval: ProductionArmingApproval = {
    approvalId: `armappr_${randomUUID().slice(0, 12)}`,
    armingId: input.armingId,
    requesterId: input.requesterId,
    approverId: input.approverId,
    scope: input.scope,
    limits: input.limits,
    validationEvidence: evidence as ValidationEvidence,
    status: "APPROVED",
    createdAt,
    expiresAt,
    scopeHash: createHash("sha256").update(JSON.stringify({ scope: input.scope, limits: input.limits, evidence: evidence!.validationId })).digest("hex").slice(0, 16),
  };

  saveArmingApproval(approval);
  if (record) {
    record.approval = approval;
    record.approvedBy = input.approverId;
    record.updatedAt = createdAt;
    saveArmingRecord(record);
  }

  recordArmingAudit({
    type: "PRODUCTION_ARMING_APPROVED",
    armingId: input.armingId,
    supplierId: input.scope.supplier,
    correlationId: record?.correlationId || input.armingId,
    actor: input.approverId,
    detail: {
      validationId: evidence!.validationId,
      scopeHash: approval.scopeHash,
      expiresAt,
    },
  });

  return { ok: true, approval, blockers: [] };
}

export function validateArmingApproval(input: {
  armingId: string;
  approvalId?: string;
}): { valid: boolean; blockers: string[]; approval?: ProductionArmingApproval } {
  const blockers: string[] = [];
  const record = getArmingRecord(input.armingId);
  const approval = input.approvalId ? getArmingApproval(input.approvalId) : record?.approval;

  if (!approval) {
    blockers.push("APPROVAL_MISSING");
    return { valid: false, blockers };
  }
  if (approval.status !== "APPROVED") blockers.push("APPROVAL_NOT_APPROVED");
  if (Date.parse(approval.expiresAt) <= Date.now()) blockers.push("APPROVAL_EXPIRED");
  if (approval.armingId !== input.armingId) blockers.push("APPROVAL_ARMING_MISMATCH");

  const { evidence, blockers: evBlockers } = loadOfficialValidationEvidence({
    supplierId: approval.scope.supplier,
    market: approval.scope.market,
    channel: approval.scope.channel,
    environment: approval.scope.environment,
  });
  if (!evidence || evidence.validationId !== approval.validationEvidence.validationId) {
    blockers.push("EVIDENCE_INTEGRITY_FAILED");
  }
  blockers.push(...evBlockers);

  return { valid: blockers.length === 0, blockers, approval };
}
