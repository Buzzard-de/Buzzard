import { evaluateArmingEligibility } from "@/lib/supplier-production-order-arming/eligibility";
import { getArmingRecord, getLatestArmingForScope } from "@/lib/supplier-production-order-arming/persistence";
import { isAiActor } from "@/lib/supplier-production-order-validation/eligibility";
import { loadOfficialValidationEvidence } from "./evidence";
import { isFirstOrderKillSwitched } from "./killSwitch";
import type { FirstOrderCheckResult } from "./types";

export function evaluateFirstProductionOrderEligibility(input: {
  supplierId: string;
  market: string;
  channel: import("@/lib/supplier-order-readiness/types").ReadinessChannel;
  environment: string;
  requester: string;
  armingId?: string;
}): { allowed: boolean; blockers: string[]; checks: FirstOrderCheckResult[]; armingId?: string } {
  const checks: FirstOrderCheckResult[] = [];
  const blockers: string[] = [];
  const environment = input.environment === "SANDBOX" || input.environment === "STAGING" ? "SANDBOX" : "PRODUCTION";

  if (isAiActor(input.requester)) blockers.push("AI_BOUNDARY:REQUEST_FORBIDDEN");

  const armingRecord = input.armingId
    ? getArmingRecord(input.armingId)
    : getLatestArmingForScope({
        supplierId: input.supplierId,
        market: input.market,
        channel: input.channel,
        environment,
      });
  const resolvedArmingId = input.armingId || armingRecord?.armingId;

  if (!resolvedArmingId || !armingRecord) {
    blockers.push("ARMING_NOT_FOUND");
    checks.push({ check: "ARMING", category: "ARMING", status: "BLOCKED", message: "No arming record" });
  } else if (armingRecord.status !== "ARMED") {
    blockers.push("ARMING_NOT_ARMED");
    checks.push({ check: "ARMING", category: "ARMING", status: "BLOCKED", message: armingRecord.status });
  } else {
    checks.push({ check: "ARMING", category: "ARMING", status: "PASS", message: "ARMED" });
  }

  const evidenceScope = {
    supplierId: input.supplierId,
    market: input.market,
    channel: input.channel,
    environment,
  };
  const { evidence, blockers: evidenceBlockers } = loadOfficialValidationEvidence(evidenceScope);
  blockers.push(...evidenceBlockers);
  checks.push({
    check: "VALIDATION_EVIDENCE",
    category: "EVIDENCE",
    status: evidence ? "PASS" : "BLOCKED",
    message: evidence ? `Evidence ${evidence.validationId}` : evidenceBlockers.join(","),
  });
  if (!evidence || evidence.createOrderCapability !== "VALIDATED") {
    blockers.push("CREATE_ORDER_UNVERIFIED");
  }

  const armingEligibility = evaluateArmingEligibility({
    supplierId: input.supplierId,
    market: input.market,
    channel: input.channel,
    environment,
    requester: input.requester,
  });
  checks.push(
    ...armingEligibility.checks.map((c) => ({
      check: c.check,
      category: c.category,
      status: c.status as FirstOrderCheckResult["status"],
      message: c.message,
    })),
  );
  blockers.push(...armingEligibility.blockers.filter((b) => !blockers.includes(b)));

  if (isFirstOrderKillSwitched(input)) {
    blockers.push("KILL_SWITCH_ACTIVE");
    checks.push({ check: "KILL_SWITCH", category: "KILL_SWITCH", status: "BLOCKED", message: "Kill switch ON" });
  } else {
    checks.push({ check: "KILL_SWITCH", category: "KILL_SWITCH", status: "PASS", message: "Kill switch OFF" });
  }

  return {
    allowed: blockers.length === 0,
    blockers: [...new Set(blockers)],
    checks,
    armingId: resolvedArmingId,
  };
}
