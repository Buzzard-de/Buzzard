import { evaluateArmingEligibility } from "./eligibility";
import { loadOfficialValidationEvidence } from "./evidence";
import { validateArmingScope } from "./scope";
import { buildArmingLimits, validateArmingLimits } from "./limits";
import { isArmingKillSwitched } from "./killSwitch";
import { assertArmingNetworkSafety } from "./safety";
import { recordArmingAudit } from "./audit";
import { getInterCarsSupplierId } from "./config";
import type { ArmingCheckResult, ProductionArmingInput, ProductionArmingScope } from "./types";

export function runProductionArmingPreflight(input: ProductionArmingInput): {
  checks: ArmingCheckResult[];
  blockers: string[];
  scope: ProductionArmingScope;
  limits: ReturnType<typeof buildArmingLimits>;
  evidence?: import("./types").ValidationEvidence;
} {
  const checks: ArmingCheckResult[] = [];
  const blockers: string[] = [];

  try {
    assertArmingNetworkSafety();
    checks.push({ check: "NETWORK", category: "NETWORK", status: "PASS", message: "Production network OFF" });
  } catch {
    blockers.push("PRODUCTION_NETWORK_MUST_BE_OFF");
    checks.push({ check: "NETWORK", category: "NETWORK", status: "BLOCKED", message: "Network enabled" });
  }

  const supplierId = input.supplier || getInterCarsSupplierId();
  const market = input.market || "DE";
  const channel = input.channel || "DIRECT";
  const environment = input.environment || "PRODUCTION";
  const currency = input.currency || "EUR";

  const scope: ProductionArmingScope = { supplier: supplierId, market, channel, environment, currency };
  const scopeCheck = validateArmingScope(scope);
  checks.push({
    check: "SCOPE",
    category: "SCOPE",
    status: scopeCheck.valid ? "PASS" : "BLOCKED",
    message: scopeCheck.blockers.join(",") || "Scope valid",
  });
  blockers.push(...scopeCheck.blockers);

  const limits = buildArmingLimits();
  const limitsCheck = validateArmingLimits({
    limits,
    supplierId,
    market,
    channel,
    environment,
  });
  checks.push({
    check: "LIMITS",
    category: "LIMITS",
    status: limitsCheck.allowed ? "PASS" : "BLOCKED",
    message: limitsCheck.blockers.join(",") || "Limits valid",
  });
  blockers.push(...limitsCheck.blockers);

  const eligibility = evaluateArmingEligibility({
    supplierId,
    market,
    channel,
    environment,
    requester: input.requester,
  });
  checks.push(...eligibility.checks);
  blockers.push(...eligibility.blockers);

  const { evidence, blockers: evidenceBlockers } = loadOfficialValidationEvidence({
    supplierId,
    market,
    channel,
    environment,
  });
  blockers.push(...evidenceBlockers);

  if (isArmingKillSwitched({ supplierId, market, channel })) {
    if (!blockers.includes("KILL_SWITCH_ACTIVE")) blockers.push("KILL_SWITCH_ACTIVE");
  }

  recordArmingAudit({
    type: blockers.length ? "PRODUCTION_ARMING_BLOCKED" : "PRODUCTION_ARMING_PREFLIGHT",
    supplierId: input.supplier,
    correlationId: input.correlationId || "preflight",
    actor: input.requester,
    detail: { blockers },
  });

  return {
    checks,
    blockers: [...new Set(blockers)],
    scope,
    limits,
    evidence,
  };
}
