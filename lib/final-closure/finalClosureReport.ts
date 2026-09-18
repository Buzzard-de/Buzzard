import { isProductionFlagEnabled } from "@/lib/production-defaults";
import { getFinalGoLiveSafetyCounters } from "@/lib/final-production-go-live/safety";
import { getAllProviderStates } from "@/lib/production-access/providerRegistry";
import { evaluateInterCarsProductionAccess } from "@/lib/supplier-inter-cars-production-access/diagnostic";
import { resolveInterCarsSecretRef } from "@/lib/production-access/secretRefs";
import { getFulfillmentPipelineDashboard } from "@/lib/first-order-fulfillment/admin";
import { getFirstProductionOrderDashboard } from "@/lib/supplier-first-production-order/admin";
import { getObservationDashboard } from "@/lib/supplier-go-live-observation/admin";
import { countRejectedEvidenceAttempts } from "./evidencePolicy";
import { buildFinalBlockerRegistry, getCriticalBlockers } from "./blockerRegistry";
import { evaluateInterCarsFlow } from "./interCarsFlow";
import { getBackupRestoreEvidence } from "./backupRestore";
import { evaluateFinalSecurityGate } from "./securityGate";
import { buildProductionMonitoringSnapshot } from "@/lib/production-completion/monitoringDashboard";
import { evaluateFinalSalesEnablement } from "./salesEnablement";
import { resolveFinalClosureState } from "./finalState";
import type { ClosureSectionReport, ClosureSectionStatus, FinalClosureReport } from "./types";

function mapAccess(access: string): ClosureSectionStatus {
  if (access === "VALIDATED" || access === "PASS" || access === "EXECUTED" || access === "COMPLETED") return "PASS";
  if (access === "CONFIGURED") return "UNVERIFIED";
  if (access === "NOT_CONFIGURED") return "NOT_CONFIGURED";
  if (access === "BLOCKED" || access === "FAILED") return "BLOCKED";
  return "UNVERIFIED";
}

function section(name: string, status: ClosureSectionStatus, message: string): ClosureSectionReport {
  return { section: name, status, message };
}

export function buildFinalClosureReport(): FinalClosureReport {
  const blockers = buildFinalBlockerRegistry();
  const critical = getCriticalBlockers(blockers);
  const interCars = evaluateInterCarsProductionAccess();
  const icSecret = resolveInterCarsSecretRef();
  const providers = getAllProviderStates();
  const payment = providers.find((p) => p.providerId === "payment")!;
  const carrier = providers.find((p) => p.providerId === "carrier")!;
  const ai = providers.find((p) => p.providerId === "ai")!;
  const returns = providers.find((p) => p.providerId === "returns")!;
  const marketing = providers.find((p) => p.providerId === "marketing")!;
  const backup = getBackupRestoreEvidence();
  const security = evaluateFinalSecurityGate();
  const monitoring = buildProductionMonitoringSnapshot();
  const salesEval = evaluateFinalSalesEnablement();
  const finalState = resolveFinalClosureState();
  const sideEffects = getFinalGoLiveSafetyCounters();
  const fakeEvidence = countRejectedEvidenceAttempts();

  let firstOrderStatus: ClosureSectionStatus = "BLOCKED";
  let observationStatus: ClosureSectionStatus = "BLOCKED";
  try {
    firstOrderStatus = mapAccess(getFirstProductionOrderDashboard().firstOrderState);
  } catch {
    firstOrderStatus = "BLOCKED";
  }
  try {
    observationStatus = mapAccess(getObservationDashboard().observationState);
  } catch {
    observationStatus = "BLOCKED";
  }

  const fulfillment = getFulfillmentPipelineDashboard();

  const sections: ClosureSectionReport[] = [
    section("SOFTWARE", "PASS", "Production closure software complete"),
    section("ACCESS", mapAccess(icSecret.credentialStatus), icSecret.credentialStatus),
    section("SUPPLIER", mapAccess(interCars.createOrderCapability), interCars.createOrderCapability),
    section("PAYMENT", mapAccess(payment.liveValidation), payment.accessState),
    section("CARRIER", mapAccess(carrier.liveValidation), carrier.accessState),
    section("AI", mapAccess(ai.liveValidation), ai.accessState),
    section("RETURNS", mapAccess(returns.liveValidation), returns.accessState),
    section("MARKETING", mapAccess(marketing.liveValidation), marketing.accessState),
    section("FIRST ORDER", firstOrderStatus, "First production order #344"),
    section("FULFILLMENT", fulfillment.pipelineState === "BLOCKED" ? "BLOCKED" : "UNVERIFIED", fulfillment.pipelineState),
    section("OBSERVATION", observationStatus, "Observation #346"),
    section("SECURITY", security.status, security.blockers.join(",") || "ok"),
    section("BACKUP", backup.result === "PASS" ? "PASS" : backup.result === "BLOCKED" ? "BLOCKED" : "UNVERIFIED", backup.result),
    section("MONITORING", monitoring.healthStatus === "HEALTHY" ? "PASS" : monitoring.healthStatus === "CRITICAL" ? "BLOCKED" : "UNVERIFIED", monitoring.healthStatus),
    section("FINANCIAL", "UNVERIFIED", "Requires live order reconciliation"),
    section("SALES", salesEval.salesEnabled === "OPEN" ? "PASS" : "BLOCKED", salesEval.reasons.join(";") || "CLOSED"),
    section("FINAL STATUS", critical.length === 0 && fakeEvidence === 0 ? "UNVERIFIED" : "BLOCKED", finalState),
  ];

  const finalGoLive = critical.length === 0 && fakeEvidence === 0 && salesEval.allowed ? "READY" : "BLOCKED";

  return {
    generatedAt: new Date().toISOString(),
    finalState,
    finalGoLive,
    finalDecision: finalGoLive,
    software: fakeEvidence > 0 ? "BLOCKED" : "PASS",
    sections,
    blockers,
    criticalBlockerCount: critical.length,
    interCarsFlow: evaluateInterCarsFlow(),
    sales: isProductionFlagEnabled("SALES") ? "OPEN" : "CLOSED",
    realSideEffects: sideEffects as unknown as Record<string, number>,
    fakeEvidenceCount: fakeEvidence,
    backupRestore: backup,
  };
}
