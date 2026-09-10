import type { ApprovalRequest, ApprovalStatus, AiTask, RiskLevel } from "./types";
import { getApproval, getApprovalsForTask, saveApproval, saveTask, getTask } from "./taskRegistry";
import { emitOrchestratorEvent } from "./events";
import { recordAudit } from "./audit";

let approvalCounter = 0;

function generateApprovalId(): string {
  approvalCounter += 1;
  return `BZ-AI-APPR-${String(approvalCounter).padStart(6, "0")}`;
}

export function requiresApproval(task: AiTask, financialImpact?: number): boolean {
  if (task.taskType === "HUMAN_APPROVAL_REQUIRED") return true;
  if (task.authorityLevel === "EXECUTE_WITH_APPROVAL") return true;
  if (financialImpact !== undefined && financialImpact >= 500) return true;
  if (task.recommendation?.requiredApproval) return true;
  return false;
}

export function createApprovalRequest(input: {
  taskId: string;
  requestedAction: string;
  reason: string;
  riskLevel: RiskLevel;
  financialImpact?: number;
  currency?: string;
  requestedBy: string;
}): ApprovalRequest | undefined {
  const task = getTask(input.taskId);
  if (!task) return undefined;

  const approval: ApprovalRequest = {
    approvalId: generateApprovalId(),
    taskId: input.taskId,
    requestedAction: input.requestedAction,
    reason: input.reason,
    riskLevel: input.riskLevel,
    financialImpact: input.financialImpact,
    currency: input.currency,
    requestedBy: input.requestedBy,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };

  saveApproval(approval);
  task.requiredApprovals.push(approval.approvalId);
  saveTask(task);

  emitOrchestratorEvent({
    type: "APPROVAL_REQUESTED",
    taskId: input.taskId,
    source: "approvalEngine",
    correlationId: task.correlationId,
    metadata: { approvalId: approval.approvalId, riskLevel: input.riskLevel },
  });

  recordAudit({
    actor: input.requestedBy,
    actorType: "SYSTEM",
    taskId: input.taskId,
    action: "APPROVAL_REQUESTED",
    newState: "PENDING",
    correlationId: task.correlationId,
    reason: input.reason,
  });

  return approval;
}

export function resolveApproval(
  approvalId: string,
  decision: "APPROVED" | "REJECTED",
  approvedBy: string
): { ok: boolean; approval?: ApprovalRequest; errorCode?: string } {
  const approval = getApproval(approvalId);
  if (!approval) return { ok: false, errorCode: "APPROVAL_NOT_FOUND" };
  if (approval.status !== "PENDING") return { ok: false, errorCode: "APPROVAL_NOT_PENDING" };

  approval.status = decision;
  approval.approvedBy = approvedBy;
  approval.resolvedAt = new Date().toISOString();
  saveApproval(approval);

  const task = getTask(approval.taskId);
  emitOrchestratorEvent({
    type: decision === "APPROVED" ? "APPROVAL_APPROVED" : "APPROVAL_REJECTED",
    taskId: approval.taskId,
    source: "approvalEngine",
    correlationId: task?.correlationId,
    metadata: { approvalId },
  });

  recordAudit({
    actor: approvedBy,
    actorType: "ADMIN",
    taskId: approval.taskId,
    action: decision === "APPROVED" ? "APPROVAL_APPROVED" : "APPROVAL_REJECTED",
    previousState: "PENDING",
    newState: decision,
    correlationId: task?.correlationId,
  });

  return { ok: true, approval };
}

export function getTaskApprovalStatus(taskId: string): ApprovalStatus {
  const approvals = getApprovalsForTask(taskId);
  if (approvals.length === 0) return "NOT_REQUIRED";
  if (approvals.some((a) => a.status === "PENDING")) return "PENDING";
  if (approvals.some((a) => a.status === "REJECTED")) return "REJECTED";
  if (approvals.every((a) => a.status === "APPROVED")) return "APPROVED";
  return "NOT_REQUIRED";
}

export function resetApprovalCounter(): void {
  approvalCounter = 0;
}
