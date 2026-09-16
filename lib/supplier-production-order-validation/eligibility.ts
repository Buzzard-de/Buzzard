import { isActivationKillSwitched } from "@/lib/supplier-order-readiness/killSwitch";
import { getLatestValidationForScope as getProductionValidation } from "@/lib/supplier-production-validation/persistence";
import { listActivationRecords } from "@/lib/supplier-order-activation/persistence";
import { executeRealSupplierOrder } from "@/lib/supplier-order-activation/activation";
import type { CreateOrderValidationInput } from "./types";

export function evaluateUpstreamGates(input: {
  supplierId: string;
  market: string;
  channel: import("@/lib/supplier-order-readiness/types").ReadinessChannel;
  environment: string;
  requester: string;
  approver?: string;
}): { allowed: boolean; blockers: string[] } {
  const blockers: string[] = [];

  const prodVal = getProductionValidation({
    supplierId: input.supplierId,
    market: input.market,
    channel: input.channel,
    environment: input.environment,
  });
  if (!prodVal || prodVal.overallStatus !== "PASSED") {
    blockers.push("PRODUCTION_VALIDATION_NOT_READY");
  }

  const activation = listActivationRecords()
    .filter(
      (a) =>
        a.supplierId === input.supplierId &&
        a.market === input.market &&
        a.channel === input.channel &&
        a.environment === input.environment,
    )
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];
  if (!activation || !["APPROVED", "ACTIVE"].includes(activation.status)) {
    blockers.push("ACTIVATION_NOT_APPROVED");
  }

  if (isActivationKillSwitched(input)) {
    blockers.push("KILL_SWITCH_ACTIVE");
  }

  if (input.approver && input.approver === input.requester) {
    blockers.push("SELF_APPROVAL_FORBIDDEN");
  }

  return { allowed: blockers.length === 0, blockers };
}

export function isAiActor(actor?: string): boolean {
  if (!actor) return false;
  const lower = actor.toLowerCase();
  return lower.includes("ai_agent") || lower.includes("ai-agent") || lower === "ai";
}

export function assertAiBoundary(input: CreateOrderValidationInput): string[] {
  const blockers: string[] = [];
  if (isAiActor(input.requester)) blockers.push("AI_BOUNDARY:REQUEST_FORBIDDEN");
  if (isAiActor(input.approver)) blockers.push("AI_BOUNDARY:APPROVE_FORBIDDEN");
  return blockers;
}

export function assertActivationSafetyNotBypassed(activationId?: string): string[] {
  if (!activationId) return [];
  const result = executeRealSupplierOrder({
    activationId,
    actorId: "validation-check",
    humanConfirmation: false,
  });
  if (!result.blocked) return ["ACTIVATION_SAFETY_BYPASS"];
  return [];
}
