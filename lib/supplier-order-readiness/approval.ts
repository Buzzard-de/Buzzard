import { randomUUID } from "crypto";
import { APPROVAL_TTL_MS } from "./config";
import { recordReadinessAudit } from "./audit";
import {
  getApprovalForScope,
  getApprovalRecord,
  getReadinessRecord,
  listApprovalRecords,
  saveApprovalRecord,
  saveReadinessRecord,
} from "./persistence";
import type { ApprovalStatus, ReadinessScope, SupplierOrderApproval } from "./types";

function isExpired(iso: string): boolean {
  return Date.parse(iso) <= Date.now();
}

export function requestSupplierOrderApproval(input: {
  readinessId: string;
  requester: string;
  correlationId: string;
  orderRiskLevel?: SupplierOrderApproval["orderRiskLevel"];
}): { ok: boolean; approval?: SupplierOrderApproval; error?: string } {
  const readiness = getReadinessRecord(input.readinessId);
  if (!readiness) return { ok: false, error: "READINESS_NOT_FOUND" };
  if (readiness.overallStatus === "BLOCKED") {
    return { ok: false, error: "READINESS_BLOCKED" };
  }

  const expiresAt = new Date(Date.now() + APPROVAL_TTL_MS).toISOString();
  const approval: SupplierOrderApproval = {
    approvalId: `appr_${randomUUID().slice(0, 12)}`,
    readinessId: readiness.readinessId,
    supplierId: readiness.supplierId,
    market: readiness.market,
    channel: readiness.channel,
    orderRiskLevel: input.orderRiskLevel,
    status: "PENDING",
    requester: input.requester,
    requestedAt: new Date().toISOString(),
    approvalScope: {
      supplierId: readiness.supplierId,
      market: readiness.market,
      channel: readiness.channel,
      environment: readiness.environment,
    },
    expiresAt,
    correlationId: input.correlationId,
  };

  saveApprovalRecord(approval);
  readiness.approvalStatus = "PENDING";
  saveReadinessRecord(readiness);
  recordReadinessAudit({
    type: "APPROVAL_REQUESTED",
    supplierId: readiness.supplierId,
    market: readiness.market,
    channel: readiness.channel,
    actor: input.requester,
    correlationId: input.correlationId,
    detail: { approvalId: approval.approvalId },
  });
  return { ok: true, approval };
}

export function approveSupplierOrderActivation(input: {
  approvalId: string;
  approver: string;
  correlationId: string;
}): { ok: boolean; approval?: SupplierOrderApproval; error?: string } {
  const approval = getApprovalRecord(input.approvalId);
  if (!approval) return { ok: false, error: "APPROVAL_NOT_FOUND" };
  if (approval.requester === input.approver) {
    recordReadinessAudit({
      type: "APPROVAL_REJECTED",
      supplierId: approval.supplierId,
      market: approval.market,
      channel: approval.channel,
      actor: input.approver,
      correlationId: input.correlationId,
      detail: { reason: "SELF_APPROVAL_FORBIDDEN", approvalId: approval.approvalId },
    });
    return { ok: false, error: "SELF_APPROVAL_FORBIDDEN" };
  }
  if (approval.status !== "PENDING") return { ok: false, error: "APPROVAL_NOT_PENDING" };
  if (isExpired(approval.expiresAt)) {
    approval.status = "EXPIRED";
    saveApprovalRecord(approval);
    return { ok: false, error: "APPROVAL_EXPIRED" };
  }

  const readiness = getReadinessRecord(approval.readinessId);
  if (!readiness || readiness.overallStatus === "BLOCKED" || readiness.overallStatus === "EXPIRED") {
    return { ok: false, error: "READINESS_NOT_APPROVABLE" };
  }

  approval.status = "APPROVED";
  approval.approver = input.approver;
  approval.approvedAt = new Date().toISOString();
  saveApprovalRecord(approval);

  if (readiness) {
    readiness.approvalStatus = "APPROVED";
    saveReadinessRecord(readiness);
  }

  recordReadinessAudit({
    type: "APPROVAL_APPROVED",
    supplierId: approval.supplierId,
    market: approval.market,
    channel: approval.channel,
    actor: input.approver,
    correlationId: input.correlationId,
    detail: { approvalId: approval.approvalId },
  });
  return { ok: true, approval };
}

export function rejectSupplierOrderApproval(input: {
  approvalId: string;
  approver: string;
  reason: string;
  correlationId: string;
}): { ok: boolean; approval?: SupplierOrderApproval; error?: string } {
  const approval = getApprovalRecord(input.approvalId);
  if (!approval) return { ok: false, error: "APPROVAL_NOT_FOUND" };
  if (approval.status !== "PENDING") return { ok: false, error: "APPROVAL_NOT_PENDING" };

  approval.status = "REJECTED";
  approval.approver = input.approver;
  approval.rejectedAt = new Date().toISOString();
  approval.rejectionReason = input.reason;
  saveApprovalRecord(approval);

  const readiness = getReadinessRecord(approval.readinessId);
  if (readiness) {
    readiness.approvalStatus = "REJECTED";
    saveReadinessRecord(readiness);
  }

  recordReadinessAudit({
    type: "APPROVAL_REJECTED",
    supplierId: approval.supplierId,
    market: approval.market,
    channel: approval.channel,
    actor: input.approver,
    correlationId: input.correlationId,
    detail: { approvalId: approval.approvalId, reason: input.reason },
  });
  return { ok: true, approval };
}

export function resolveEffectiveApproval(scope: ReadinessScope): SupplierOrderApproval | undefined {
  const approval = getApprovalForScope(scope.supplierId, scope.market, scope.channel, "APPROVED");
  if (!approval) return undefined;
  if (isExpired(approval.expiresAt)) {
    approval.status = "EXPIRED";
    saveApprovalRecord(approval);
    return undefined;
  }
  return approval;
}

export function refreshApprovalExpiryStatus(): number {
  let expired = 0;
  for (const approval of listApprovalRecords()) {
    if (approval.status === "APPROVED" && isExpired(approval.expiresAt)) {
      approval.status = "EXPIRED";
      saveApprovalRecord(approval);
      expired++;
    }
  }
  return expired;
}

export function getApprovalStatusForScope(scope: ReadinessScope): ApprovalStatus {
  const approved = getApprovalForScope(scope.supplierId, scope.market, scope.channel, "APPROVED");
  if (approved) {
    if (isExpired(approved.expiresAt)) return "EXPIRED";
    return "APPROVED";
  }
  const latest = getApprovalForScope(scope.supplierId, scope.market, scope.channel);
  if (!latest) return "PENDING";
  if (isExpired(latest.expiresAt)) return "EXPIRED";
  return latest.status;
}
