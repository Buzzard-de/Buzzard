export type ApprovalLifecycleStatus =
  | "REQUESTED"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED"
  | "EXECUTED";

export type ApprovalRisk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface HumanApprovalRecord {
  approvalId: string;
  requestId: string;
  actor: string;
  scope: string;
  action: string;
  risk: ApprovalRisk;
  expiresAt: string;
  payloadHash: string;
  reason: string;
  timestamp: string;
  status: ApprovalLifecycleStatus;
  approver1?: string;
  approver2?: string;
  environment: string;
}
