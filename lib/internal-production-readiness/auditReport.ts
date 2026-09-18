import { getProductionFlagsSnapshot } from "@/lib/production-defaults";
import { buildExternalAccessPreflightReport } from "@/lib/final-external-access/preflightReport";
import { buildFinalClosureReport } from "@/lib/final-closure/finalClosureReport";
import { buildReadinessMatrix } from "./readinessMatrix";
import { buildEngineIntegrityAudit } from "./engineIntegrityAudit";
import { buildClassifiedBlockers, buildWarnings } from "./blockerClassification";
import { buildNextActions } from "./nextActions";
import { captureSideEffectCounters, assertZeroSideEffects } from "./sideEffects";
import type { InternalProductionReadinessAudit, ScoreboardValue, TestExecutionResult } from "./types";

function resolveScoreboard(
  preflight: ReturnType<typeof buildExternalAccessPreflightReport>,
  closure: ReturnType<typeof buildFinalClosureReport>,
  matrixBlocked: boolean,
  sideEffectViolations: string[],
  unexpectedFlags: boolean,
): InternalProductionReadinessAudit["scoreboard"] {
  const softwareComplete: ScoreboardValue =
    preflight.softwareComplete && closure.software === "PASS" && !sideEffectViolations.length ? "YES" : "NO";

  const internalReadiness: ScoreboardValue =
    softwareComplete === "YES" && !matrixBlocked ? "YES" : softwareComplete === "YES" ? "YES" : "NO";

  const configComplete: ScoreboardValue = preflight.configComplete ? "YES" : "NO";

  const externalAccess: ScoreboardValue = preflight.externalAccessComplete
    ? "YES"
    : preflight.blockers.some((b) => b.includes("CREDENTIAL") || b.includes("NOT_CONFIGURED"))
      ? "BLOCKED"
      : "NO";

  const liveValidation: ScoreboardValue = preflight.liveValidationComplete ? "YES" : "BLOCKED";

  const deploymentReady: ScoreboardValue =
    process.env.PERSISTENT_DATA_PATH === "/var/data" ? "YES" : "BLOCKED";

  const productionReady: ScoreboardValue =
    softwareComplete === "YES" && externalAccess === "YES" && liveValidation === "YES" && deploymentReady === "YES"
      ? "YES"
      : "NO";

  const goLiveReady: ScoreboardValue = productionReady === "YES" && closure.finalGoLive === "READY" ? "YES" : "NO";

  if (unexpectedFlags) {
    return {
      SOFTWARE_COMPLETE: softwareComplete,
      CONFIG_COMPLETE: configComplete,
      INTERNAL_READINESS: "NO",
      EXTERNAL_ACCESS: externalAccess,
      LIVE_VALIDATION: liveValidation,
      DEPLOYMENT_READY: deploymentReady,
      PRODUCTION_READY: "NO",
      GO_LIVE_READY: "NO",
      SALES_ENABLED: "1",
    };
  }

  return {
    SOFTWARE_COMPLETE: softwareComplete,
    CONFIG_COMPLETE: configComplete,
    INTERNAL_READINESS: internalReadiness,
    EXTERNAL_ACCESS: externalAccess,
    LIVE_VALIDATION: liveValidation,
    DEPLOYMENT_READY: deploymentReady,
    PRODUCTION_READY: productionReady,
    GO_LIVE_READY: goLiveReady,
    SALES_ENABLED: preflight.salesEnabled === "1" ? "1" : "0",
  };
}

export function buildInternalProductionReadinessAudit(input?: {
  testResults?: TestExecutionResult[];
  sideEffectStart?: ReturnType<typeof captureSideEffectCounters>;
  sideEffectEnd?: ReturnType<typeof captureSideEffectCounters>;
}): InternalProductionReadinessAudit {
  const preflight = buildExternalAccessPreflightReport();
  const closure = buildFinalClosureReport();
  const readinessMatrix = buildReadinessMatrix();
  const engineIntegrity = buildEngineIntegrityAudit();
  const blockers = buildClassifiedBlockers();
  const warnings = buildWarnings();
  const nextActions = buildNextActions();

  const flags = getProductionFlagsSnapshot();
  const productionFlags: Record<string, string> = {
    SALES_ENABLED: flags.SALES === "ON" ? "1" : "0",
    SUPPLIER_NETWORK_ENABLED: flags.SUPPLIER_NETWORK === "ON" ? "1" : "0",
    SUPPLIER_ORDER_NETWORK_ENABLED: flags.SUPPLIER_ORDER_NETWORK === "ON" ? "1" : "0",
    PAYMENT_PRODUCTION_ENABLED: flags.PAYMENT_PRODUCTION === "ON" ? "1" : "0",
    CARRIER_PRODUCTION_ENABLED: flags.CARRIER_PRODUCTION === "ON" ? "1" : "0",
    RETURNS_PRODUCTION_ENABLED: flags.RETURNS_PRODUCTION === "ON" ? "1" : "0",
    MARKETING_SPEND_ENABLED: flags.MARKETING_SPEND === "ON" ? "1" : "0",
    AI_PRODUCTION_ENABLED: flags.AI_PRODUCTION === "ON" ? "1" : "0",
  };

  const unexpectedFlags = Object.values(productionFlags).some((v) => v === "1");
  const sideEffectStart = input?.sideEffectStart ?? captureSideEffectCounters();
  const sideEffectEnd = input?.sideEffectEnd ?? captureSideEffectCounters();
  const sideEffectViolations = [
    ...assertZeroSideEffects(sideEffectStart),
    ...assertZeroSideEffects(sideEffectEnd),
  ];

  const matrixSoftwareBlocked = readinessMatrix.some(
    (e) => e.status === "MISSING" || (e.area === "PRODUCTION_FLAGS" && e.status === "BLOCKED"),
  );

  const auditFailureReasons: string[] = [];
  if (unexpectedFlags) auditFailureReasons.push("Production flag unexpectedly ON");
  if (sideEffectViolations.length) auditFailureReasons.push(...sideEffectViolations);

  const scoreboard = resolveScoreboard(
    preflight,
    closure,
    matrixSoftwareBlocked,
    sideEffectViolations,
    unexpectedFlags,
  );

  return {
    generatedAt: new Date().toISOString(),
    scoreboard,
    readinessMatrix,
    engineIntegrity,
    blockers,
    warnings,
    nextActions,
    testResults: input?.testResults ?? [],
    sideEffectCounters: { start: sideEffectStart, end: sideEffectEnd },
    productionFlags,
    auditFailure: auditFailureReasons.length > 0,
    auditFailureReasons,
  };
}
