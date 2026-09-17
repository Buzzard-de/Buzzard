import { evaluateFirstProductionOrderEligibility } from "@/lib/supplier-first-production-order/eligibility";
import { getLatestFirstProductionOrderForScope } from "@/lib/supplier-first-production-order/persistence";
import { isAiActor } from "@/lib/supplier-production-order-validation/eligibility";
import { isFirstOrderKillSwitched } from "@/lib/supplier-first-production-order/killSwitch";
import type { FulfillmentPipelineScope, StageCheckResult } from "./types";

export function evaluateFulfillmentEligibility(input: {
  scope: FulfillmentPipelineScope;
  requester: string;
  orderValue: number;
  quantity: number;
}): { allowed: boolean; blockers: string[]; checks: StageCheckResult[] } {
  const checks: StageCheckResult[] = [];
  const blockers: string[] = [];

  if (isAiActor(input.requester)) {
    blockers.push("AI_BOUNDARY:FULFILLMENT_FORBIDDEN");
    checks.push({ stage: "FOUR_EYES_APPROVAL", status: "BLOCKED", message: "AI cannot authorize" });
  }

  if (isFirstOrderKillSwitched(input.scope)) {
    blockers.push("KILL_SWITCH_ACTIVE");
    checks.push({ stage: "KILL_SWITCH", status: "BLOCKED", message: "Kill switch active" });
  }

  const fpo = evaluateFirstProductionOrderEligibility({
    supplierId: input.scope.supplierId,
    market: input.scope.market,
    channel: input.scope.channel,
    environment: input.scope.environment,
    requester: input.requester,
  });
  blockers.push(...fpo.blockers);
  checks.push({
    stage: "EXECUTION_AUTHORIZATION",
    status: fpo.allowed ? "PASS" : "BLOCKED",
    message: fpo.blockers.join(",") || "Upstream #344 eligible",
  });

  const existing = getLatestFirstProductionOrderForScope({
    supplierId: input.scope.supplierId,
    market: input.scope.market,
    channel: input.scope.channel,
  });
  if (existing?.state === "EXECUTED") {
    blockers.push("SINGLE_ORDER_LIMIT:ALREADY_EXECUTED");
    checks.push({ stage: "LIMITS", status: "BLOCKED", message: "One-order limit reached" });
  }

  const maxValue = Number(process.env.FULFILLMENT_MAX_ORDER_VALUE || "500");
  if (input.orderValue > maxValue) {
    blockers.push("ORDER_VALUE_EXCEEDS_LIMIT");
    checks.push({ stage: "LIMITS", status: "BLOCKED", message: `>${maxValue}` });
  }

  const maxQty = Number(process.env.FULFILLMENT_MAX_QUANTITY || "5");
  if (input.quantity > maxQty) {
    blockers.push("QUANTITY_EXCEEDS_LIMIT");
    checks.push({ stage: "LIMITS", status: "BLOCKED", message: `>${maxQty}` });
  }

  return { allowed: blockers.length === 0, blockers: [...new Set(blockers)], checks };
}
