import { isAiActor } from "@/lib/supplier-production-order-validation/eligibility";
import { assertAiProductionSafety, recordBlockedAiExecution } from "./safety";
import type { AiProductionAuthority, AiWorkerId } from "./types";

const BLOCKED_ACTIONS = new Set([
  "ENABLE_NETWORK",
  "SEND_ORDER",
  "APPROVE_LIVE_VALIDATION",
  "PROMOTE_CAPABILITY",
  "CAPTURE_PAYMENT",
  "PURCHASE_LABEL",
  "ISSUE_REFUND",
  "ACTIVATE_MARKETING",
]);

export function resolveDefaultAuthority(): AiProductionAuthority {
  return "RECOMMEND";
}

export function canAiPerformAction(input: {
  actorId: string;
  action: string;
  workerId?: AiWorkerId;
}): { allowed: boolean; authority: AiProductionAuthority; reason?: string } {
  assertAiProductionSafety();
  const authority = resolveDefaultAuthority();

  if (BLOCKED_ACTIONS.has(input.action)) {
    recordBlockedAiExecution();
    return { allowed: false, authority: "EXECUTE_BLOCKED", reason: "AI_BOUNDARY" };
  }

  if (isAiActor(input.actorId) && ["APPROVE", "EXECUTE", "ARM", "ACTIVATE"].some((p) => input.action.includes(p))) {
    recordBlockedAiExecution();
    return { allowed: false, authority: "EXECUTE_BLOCKED", reason: "AI_APPROVAL_FORBIDDEN" };
  }

  return { allowed: true, authority };
}

export function redactAiContext(context: Record<string, unknown>): Record<string, unknown> {
  const redacted = { ...context };
  for (const key of Object.keys(redacted)) {
    if (/secret|token|password|authorization|card|cvv/i.test(key)) {
      redacted[key] = "[REDACTED]";
    }
  }
  return redacted;
}
