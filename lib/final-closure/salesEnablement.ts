import { isProductionFlagEnabled } from "@/lib/production-defaults";
import { getFinalGoLiveSafetyCounters } from "@/lib/final-production-go-live/safety";
import { countRejectedEvidenceAttempts } from "./evidencePolicy";
import { buildFinalBlockerRegistry, getCriticalBlockers } from "./blockerRegistry";
import { getBackupRestoreEvidence } from "./backupRestore";
import { evaluateFinalSecurityGate } from "./securityGate";
import { getFirstProductionOrderDashboard } from "@/lib/supplier-first-production-order/admin";
import { getObservationDashboard } from "@/lib/supplier-go-live-observation/admin";
import type { FinalSalesEnablementResult } from "./types";

export function evaluateFinalSalesEnablement(): FinalSalesEnablementResult {
  const reasons: string[] = [];
  const blockers: string[] = [];
  const registry = buildFinalBlockerRegistry();
  const critical = getCriticalBlockers(registry);

  if (critical.length > 0) {
    reasons.push(`criticalBlockers=${critical.length}`);
    blockers.push(...critical.map((b) => b.code));
  }

  const fakeEvidence = countRejectedEvidenceAttempts();
  if (fakeEvidence > 0) {
    reasons.push(`fakeEvidence=${fakeEvidence}`);
    blockers.push("FAKE_EVIDENCE_DETECTED");
  }

  const security = evaluateFinalSecurityGate();
  if (security.status !== "PASS") {
    reasons.push("security!=PASS");
    blockers.push("SECURITY");
  }

  const backup = getBackupRestoreEvidence();
  if (backup.result !== "PASS") {
    reasons.push(`backupRestore=${backup.result}`);
    blockers.push("BACKUP_RESTORE");
  }

  try {
    const firstOrder = getFirstProductionOrderDashboard();
    if (firstOrder.firstOrderState !== "EXECUTED") {
      reasons.push("firstOrder!=EXECUTED");
      blockers.push("FIRST_PRODUCTION_ORDER");
    }
  } catch {
    reasons.push("firstOrder_unavailable");
    blockers.push("FIRST_PRODUCTION_ORDER");
  }

  try {
    const obs = getObservationDashboard();
    if (obs.observationState !== "COMPLETED") {
      reasons.push("observation!=COMPLETED");
      blockers.push("OBSERVATION");
    }
  } catch {
    reasons.push("observation_unavailable");
    blockers.push("OBSERVATION");
  }

  const sideEffects = getFinalGoLiveSafetyCounters();
  const unauthorizedSideEffects = Object.entries(sideEffects).some(([, v]) => v > 0);
  if (unauthorizedSideEffects && !isProductionFlagEnabled("SALES")) {
    /* side effects without sales still block */
    reasons.push("unauthorized_side_effects");
  }

  const envSales = isProductionFlagEnabled("SALES");
  const allowed = blockers.length === 0;

  if (envSales && !allowed) {
    reasons.push("SALES_ENABLED_BUT_GATES_NOT_PASS");
  }

  return {
    allowed: allowed && envSales ? true : allowed && !envSales,
    salesEnabled: envSales && allowed ? "OPEN" : "CLOSED",
    blockers: [...new Set(blockers)],
    reasons,
  };
}
