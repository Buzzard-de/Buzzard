import { createHash } from "node:crypto";
import { resolveActivationConfig } from "./config";
import { recordActivationAudit } from "./audit";
import { getActivationRecord, saveActivationRecord } from "./persistence";
import type {
  SupplierOrderActivationApproval,
  SupplierOrderActivationRequest,
} from "./types";

function nowIso(): string {
  return new Date().toISOString();
}

function buildApprovalId(): string {
  return `soa-appr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createActivationApproval(input: {
  activationId: string;
  approverId: string;
  requesterId: string;
  scope: SupplierOrderActivationApproval["scope"];
}): { ok: true; approval: SupplierOrderActivationApproval } | { ok: false; blockers: string[] } {
  const cfg = resolveActivationConfig();
  const blockers: string[] = [];

  if (input.approverId === input.requesterId) {
    blockers.push("SELF_APPROVAL_FORBIDDEN");
  }
  if (!input.approverId || !input.requesterId) {
    blockers.push("IDENTITY_REQUIRED");
  }

  const activation = getActivationRecord(input.activationId);
  if (!activation) {
    blockers.push("ACTIVATION_NOT_FOUND");
  }
  if (activation && activation.requestedBy !== input.requesterId) {
    blockers.push("REQUESTER_MISMATCH");
  }

  if (blockers.length > 0) {
    return { ok: false, blockers };
  }

  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + cfg.approvalTtlMs).toISOString();
  const approval: SupplierOrderActivationApproval = {
    approvalId: buildApprovalId(),
    activationId: input.activationId,
    requesterId: input.requesterId,
    approverId: input.approverId,
    scope: input.scope,
    status: "APPROVED",
    createdAt,
    expiresAt,
    scopeHash: createHash("sha256")
      .update(JSON.stringify(input.scope))
      .digest("hex"),
  };

  const record = getActivationRecord(input.activationId)!;
  record.approvalId = approval.approvalId;
  record.approvedBy = input.approverId;
  record.status = "APPROVED";
  record.updatedAt = createdAt;
  saveActivationRecord(record);

  recordActivationAudit({
    type: "APPROVAL_GRANTED",
    activationId: input.activationId,
    actor: input.approverId,
    correlationId: record.activationId,
    detail: { approvalId: approval.approvalId, expiresAt },
  });

  return { ok: true, approval };
}

export function rejectActivationApproval(input: {
  activationId: string;
  approverId: string;
  reason: string;
}): { ok: boolean; blockers: string[] } {
  const activation = getActivationRecord(input.activationId);
  if (!activation) {
    return { ok: false, blockers: ["ACTIVATION_NOT_FOUND"] };
  }
  if (input.approverId === activation.requestedBy) {
    return { ok: false, blockers: ["SELF_APPROVAL_FORBIDDEN"] };
  }

  activation.status = "BLOCKED";
  activation.reason = input.reason;
  activation.updatedAt = nowIso();
  saveActivationRecord(activation);

  recordActivationAudit({
    type: "APPROVAL_REJECTED",
    activationId: input.activationId,
    actor: input.approverId,
    correlationId: activation.activationId,
    detail: { reason: input.reason },
  });

  return { ok: true, blockers: [] };
}

export function validateApprovalForActivation(
  activation: SupplierOrderActivationRequest,
  approval: SupplierOrderActivationApproval | null,
): { valid: boolean; blockers: string[] } {
  const blockers: string[] = [];
  if (!approval) {
    blockers.push("APPROVAL_MISSING");
    return { valid: false, blockers };
  }
  if (approval.status !== "APPROVED") {
    blockers.push("APPROVAL_NOT_APPROVED");
  }
  if (new Date(approval.expiresAt).getTime() < Date.now()) {
    blockers.push("APPROVAL_EXPIRED");
  }
  if (approval.approverId === approval.requesterId) {
    blockers.push("SELF_APPROVAL_FORBIDDEN");
  }
  if (approval.activationId !== activation.activationId) {
    blockers.push("APPROVAL_ACTIVATION_MISMATCH");
  }

  const scope = approval.scope;
  if (
    scope.supplierId !== activation.supplierId ||
    scope.environment !== activation.environment ||
    scope.market !== activation.market ||
    scope.channel !== activation.channel
  ) {
    blockers.push("APPROVAL_SCOPE_MISMATCH");
  }
  const activationMax = activation.maxOrderValue ?? scope.maxOrderValue;
  if (scope.maxOrderValue < activationMax) {
    blockers.push("APPROVAL_LIMIT_SCOPE_MISMATCH");
  }

  return { valid: blockers.length === 0, blockers };
}

export function getApprovalForActivation(
  activationId: string,
): SupplierOrderActivationApproval | null {
  const activation = getActivationRecord(activationId);
  if (!activation?.approvalId) return null;
  const cfg = resolveActivationConfig();
  const approved =
    activation.status === "APPROVED" ||
    activation.status === "ACTIVE" ||
    activation.networkState === "ARMED" ||
    activation.networkState === "ENABLED";
  return {
    approvalId: activation.approvalId,
    activationId,
    requesterId: activation.requestedBy,
    approverId: activation.approvedBy ?? "",
    scope: {
      supplierId: activation.supplierId,
      adapterProfile: activation.adapterProfile,
      environment: activation.environment,
      market: activation.market,
      channel: activation.channel,
      maxOrderValue: activation.maxOrderValue ?? cfg.defaultMaxOrderValue,
      maxDailyOrderValue: activation.maxDailyOrderValue ?? cfg.defaultMaxDailyOrderValue,
      maxOrders: activation.maxOrders ?? cfg.defaultMaxOrders,
      riskLevel: activation.riskLevel,
    },
    status: approved ? "APPROVED" : "REJECTED",
    createdAt: activation.createdAt,
    expiresAt: activation.expiresAt ?? new Date(Date.now() + cfg.approvalTtlMs).toISOString(),
    scopeHash: "",
  };
}
