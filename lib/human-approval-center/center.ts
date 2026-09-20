import { createHash } from "crypto";
import type { ApprovalLifecycleStatus, ApprovalRisk, HumanApprovalRecord } from "./types";

const approvals = new Map<string, HumanApprovalRecord>();
let approvalCounter = 0;

function id(): string {
  approvalCounter += 1;
  return `BZ-HAPPR-${String(approvalCounter).padStart(8, "0")}`;
}

export function resetHumanApprovalCenterForTests(): void {
  approvals.clear();
  approvalCounter = 0;
}

export function hashApprovalPayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function requestHumanApproval(input: {
  requestId: string;
  actor: string;
  scope: string;
  action: string;
  risk: ApprovalRisk;
  payload: unknown;
  reason: string;
  expiresAt: string;
  environment?: string;
}): HumanApprovalRecord {
  const record: HumanApprovalRecord = {
    approvalId: id(),
    requestId: input.requestId,
    actor: input.actor,
    scope: input.scope,
    action: input.action,
    risk: input.risk,
    expiresAt: input.expiresAt,
    payloadHash: hashApprovalPayload(input.payload),
    reason: input.reason,
    timestamp: new Date().toISOString(),
    status: input.risk === "CRITICAL" || input.risk === "HIGH" ? "REQUESTED" : "PENDING",
    environment: input.environment ?? "PRODUCTION",
  };
  approvals.set(record.approvalId, record);
  return record;
}

export function approveHumanAction(
  approvalId: string,
  approver: string,
  payload: unknown
): { ok: boolean; record?: HumanApprovalRecord; errorCode?: string } {
  const record = approvals.get(approvalId);
  if (!record) return { ok: false, errorCode: "APPROVAL_NOT_FOUND" };
  if (record.status === "EXPIRED" || Date.parse(record.expiresAt) < Date.now()) {
    record.status = "EXPIRED";
    return { ok: false, errorCode: "APPROVAL_EXPIRED" };
  }
  const hash = hashApprovalPayload(payload);
  if (hash !== record.payloadHash) return { ok: false, errorCode: "PAYLOAD_HASH_MISMATCH" };

  const needsFourEyes = record.risk === "HIGH" || record.risk === "CRITICAL";
  if (needsFourEyes) {
    if (!record.approver1) {
      if (approver === record.actor) return { ok: false, errorCode: "FOUR_EYES_SAME_ACTOR" };
      record.approver1 = approver;
      record.status = "PENDING";
      return { ok: true, record };
    }
    if (approver === record.approver1 || approver === record.actor) {
      return { ok: false, errorCode: "FOUR_EYES_SAME_APPROVER" };
    }
    record.approver2 = approver;
    record.status = "APPROVED";
    return { ok: true, record };
  }

  if (approver === record.actor) return { ok: false, errorCode: "SELF_APPROVAL_DENIED" };
  record.approver1 = approver;
  record.status = "APPROVED";
  return { ok: true, record };
}

export function isApprovalValidForAction(
  approvalId: string,
  scope: string,
  action: string,
  payload: unknown
): boolean {
  const record = approvals.get(approvalId);
  if (!record || record.status !== "APPROVED") return false;
  if (record.scope !== scope || record.action !== action) return false;
  if (hashApprovalPayload(payload) !== record.payloadHash) return false;
  if (Date.parse(record.expiresAt) < Date.now()) return false;
  return true;
}

export function listHumanApprovals(status?: ApprovalLifecycleStatus): HumanApprovalRecord[] {
  return [...approvals.values()].filter((a) => (status ? a.status === status : true));
}

export function rejectHumanApproval(approvalId: string, approver: string, reason: string): { ok: boolean; errorCode?: string } {
  const record = approvals.get(approvalId);
  if (!record) return { ok: false, errorCode: "APPROVAL_NOT_FOUND" };
  if (record.status === "EXECUTED" || record.status === "CANCELLED") return { ok: false, errorCode: "APPROVAL_FINAL" };
  record.status = "REJECTED";
  record.approver1 = approver;
  record.reason = `${record.reason} | rejected: ${reason}`;
  return { ok: true };
}

export function cancelHumanApproval(approvalId: string, actor: string): { ok: boolean; errorCode?: string } {
  const record = approvals.get(approvalId);
  if (!record) return { ok: false, errorCode: "APPROVAL_NOT_FOUND" };
  if (record.status === "EXECUTED" || record.status === "APPROVED" || record.status === "REJECTED") {
    return { ok: false, errorCode: "CANCEL_DENIED" };
  }
  if (record.actor !== actor) return { ok: false, errorCode: "CANCEL_DENIED" };
  record.status = "CANCELLED";
  return { ok: true };
}

export function markApprovalExecuted(approvalId: string): { ok: boolean; errorCode?: string } {
  const record = approvals.get(approvalId);
  if (!record) return { ok: false, errorCode: "APPROVAL_NOT_FOUND" };
  if (record.status !== "APPROVED") return { ok: false, errorCode: "APPROVAL_NOT_APPROVED" };
  if (Date.parse(record.expiresAt) < Date.now()) {
    record.status = "EXPIRED";
    return { ok: false, errorCode: "APPROVAL_EXPIRED" };
  }
  record.status = "EXECUTED";
  return { ok: true };
}

export function assertApprovalScope(
  approvalId: string,
  scope: string,
  action: string
): { ok: boolean; errorCode?: string } {
  const record = approvals.get(approvalId);
  if (!record) return { ok: false, errorCode: "APPROVAL_NOT_FOUND" };
  if (record.scope !== scope || record.action !== action) return { ok: false, errorCode: "APPROVAL_SCOPE_MISMATCH" };
  return { ok: true };
}
