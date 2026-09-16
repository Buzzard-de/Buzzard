import { evaluateSupplierOrderReadiness } from "@/lib/supplier-order-readiness/evaluator";
import { listReadinessRecords } from "@/lib/supplier-order-readiness/persistence";
import { getLatestRehearsalForScope } from "@/lib/supplier-order-activation/persistence";
import { getLatestValidationForScope as get339Validation } from "@/lib/supplier-production-validation/persistence";
import { listActivationRecords } from "@/lib/supplier-order-activation/persistence";
import { evaluateCreateOrderProductionValidationChecks } from "@/lib/supplier-production-order-validation/readinessBridge";
import { isAiActor } from "@/lib/supplier-production-order-validation/eligibility";
import { loadOfficialValidationEvidence } from "./evidence";
import { isArmingKillSwitched } from "./killSwitch";
import type { ReadinessChannel, ReadinessScope } from "@/lib/supplier-order-readiness/types";
import type { ArmingCheckResult } from "./types";

function normalizeEnvironment(environment: string): "SANDBOX" | "PRODUCTION" {
  return environment === "STAGING" || environment === "SANDBOX" ? "SANDBOX" : "PRODUCTION";
}

export function evaluateArmingEligibility(input: {
  supplierId: string;
  market: string;
  channel: ReadinessChannel;
  environment: string;
  requester: string;
  approver?: string;
}): { allowed: boolean; blockers: string[]; checks: ArmingCheckResult[] } {
  const checks: ArmingCheckResult[] = [];
  const blockers: string[] = [];
  const environment = normalizeEnvironment(input.environment);
  const scope: ReadinessScope = {
    supplierId: input.supplierId,
    market: input.market,
    channel: input.channel,
    environment,
  };

  if (isAiActor(input.requester)) blockers.push("AI_BOUNDARY:REQUEST_FORBIDDEN");
  if (isAiActor(input.approver)) blockers.push("AI_BOUNDARY:APPROVE_FORBIDDEN");
  if (input.approver && input.approver === input.requester) blockers.push("SELF_APPROVAL_FORBIDDEN");

  const savedReadiness = listReadinessRecords()
    .filter(
      (r) =>
        r.supplierId === input.supplierId &&
        r.market === input.market &&
        r.channel === input.channel,
    )
    .sort((a, b) => Date.parse(b.generatedAt) - Date.parse(a.generatedAt))[0];
  const readinessStatus =
    savedReadiness?.overallStatus ||
    evaluateSupplierOrderReadiness(scope, { force: true, correlationId: "arming-eligibility" }).overallStatus;
  checks.push({
    check: "READINESS",
    category: "READINESS",
    status: readinessStatus === "READY" ? "PASS" : "BLOCKED",
    message: readinessStatus,
  });
  if (readinessStatus !== "READY") blockers.push("READINESS_NOT_READY");

  const rehearsal = getLatestRehearsalForScope({
    supplierId: input.supplierId,
    market: input.market,
    channel: input.channel,
  });
  if (!rehearsal || rehearsal.overallStatus !== "PASSED") {
    blockers.push("REHEARSAL_MISSING");
    checks.push({ check: "REHEARSAL", category: "REHEARSAL", status: "BLOCKED", message: "No rehearsal" });
  } else {
    checks.push({ check: "REHEARSAL", category: "REHEARSAL", status: "PASS", message: "Rehearsal PASSED" });
  }

  const evidenceScope = { ...scope, environment: scope.environment || "PRODUCTION" };
  const prod339 = get339Validation(evidenceScope);
  if (!prod339 || prod339.overallStatus !== "PASSED") {
    blockers.push("PRODUCTION_VALIDATION_NOT_READY");
    checks.push({ check: "PRODUCTION_VALIDATION", category: "VALIDATION", status: "BLOCKED", message: "339 not PASSED" });
  } else {
    checks.push({ check: "PRODUCTION_VALIDATION", category: "VALIDATION", status: "PASS", message: "339 PASSED" });
  }

  const co341Checks = evaluateCreateOrderProductionValidationChecks(scope);
  checks.push(
    ...co341Checks.map((c) => ({
      check: c.code,
      category: c.category,
      status: c.level === "PASS" ? ("PASS" as const) : c.level === "WARNING" ? ("WARNING" as const) : ("BLOCKED" as const),
      message: c.message,
    })),
  );
  const co341Blocked = co341Checks.some((c) => c.level === "BLOCKED");
  if (co341Blocked) {
    blockers.push("CREATE_ORDER_VALIDATION_NOT_READY");
  }

  const { evidence, blockers: evidenceBlockers } = loadOfficialValidationEvidence(evidenceScope);
  blockers.push(...evidenceBlockers);
  checks.push({
    check: "VALIDATION_EVIDENCE",
    category: "EVIDENCE",
    status: evidence ? "PASS" : "BLOCKED",
    message: evidence ? `Evidence ${evidence.validationId}` : evidenceBlockers.join(","),
  });

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
    checks.push({ check: "ACTIVATION_SAFETY", category: "ACTIVATION", status: "BLOCKED", message: "340 not approved" });
  } else {
    checks.push({ check: "ACTIVATION_SAFETY", category: "ACTIVATION", status: "PASS", message: "340 approved" });
  }

  if (isArmingKillSwitched(input)) {
    blockers.push("KILL_SWITCH_ACTIVE");
    checks.push({ check: "KILL_SWITCH", category: "KILL_SWITCH", status: "BLOCKED", message: "Kill switch ON" });
  } else {
    checks.push({ check: "KILL_SWITCH", category: "KILL_SWITCH", status: "PASS", message: "Kill switch OFF" });
  }

  return { allowed: blockers.length === 0, blockers: [...new Set(blockers)], checks };
}
