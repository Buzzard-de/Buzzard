import { requestHumanApproval } from "@/lib/human-approval-center/center";
import type { ExceptionRecord } from "./types";
import { transitionException } from "./engine";

export function escalateExceptionToHumanApproval(
  exception: ExceptionRecord,
  actor: string
): { ok: boolean; approvalId?: string; errorCode?: string } {
  if (exception.severity !== "CRITICAL" && exception.severity !== "HIGH") {
    return { ok: false, errorCode: "EXCEPTION_NOT_CRITICAL" };
  }
  const approval = requestHumanApproval({
    requestId: exception.exceptionId,
    actor,
    scope: exception.category,
    action: "EXCEPTION_RESOLUTION",
    risk: exception.severity === "CRITICAL" ? "CRITICAL" : "HIGH",
    payload: {
      exceptionId: exception.exceptionId,
      entity: exception.entity,
      correlationId: exception.correlationId,
    },
    reason: exception.rootCause,
    expiresAt: new Date(Date.now() + 86400_000).toISOString(),
  });
  transitionException(exception.exceptionId, "WAITING_HUMAN", `approval:${approval.approvalId}`);
  return { ok: true, approvalId: approval.approvalId };
}
