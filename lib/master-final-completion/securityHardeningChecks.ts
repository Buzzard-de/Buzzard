import {
  approveHumanAction,
  isApprovalValidForAction,
  requestHumanApproval,
  resetHumanApprovalCenterForTests,
} from "@/lib/human-approval-center/center";
import { isProductionKillSwitchActive } from "@/lib/production-kill-switch";

export function runRepositorySecurityHardeningChecks(): string[] {
  resetHumanApprovalCenterForTests();
  const failures: string[] = [];

  const payload = { action: "SUPPLIER_ORDER", orderId: "O-1" };
  const req = requestHumanApproval({
    requestId: "sec-1",
    actor: "ops-a",
    scope: "order",
    action: "SUPPLIER_ORDER",
    risk: "HIGH",
    payload,
    reason: "test",
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  });

  if (isApprovalValidForAction(req.approvalId, "order", "SUPPLIER_ORDER", payload)) {
    failures.push("APPROVAL_BYPASS_WITHOUT_DECISION");
  }

  approveHumanAction(req.approvalId, "ops-b", payload);
  if (isApprovalValidForAction(req.approvalId, "order", "SUPPLIER_ORDER", payload)) {
    failures.push("FOUR_EYES_SINGLE_APPROVER_BYPASS");
  }

  approveHumanAction(req.approvalId, "ops-c", payload);
  if (!isApprovalValidForAction(req.approvalId, "order", "SUPPLIER_ORDER", payload)) {
    failures.push("FOUR_EYES_NOT_SATISFIED");
  }
  if (isApprovalValidForAction(req.approvalId, "order", "PAYMENT_CAPTURE", payload)) {
    failures.push("APPROVAL_SCOPE_NOT_ENFORCED");
  }

  if (isProductionKillSwitchActive()) {
    failures.push("KILL_SWITCH_UNEXPECTED_ACTIVE");
  }

  return failures;
}
