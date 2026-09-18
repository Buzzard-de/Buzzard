import { isProductionFlagEnabled } from "@/lib/production-defaults";
import { countRejectedEvidenceAttempts } from "@/lib/final-closure/evidencePolicy";
import { getBackupRestoreEvidence } from "@/lib/final-closure/backupRestore";
import { evaluateFinalSecurityGate } from "@/lib/final-closure/securityGate";
import { buildProductionMonitoringSnapshot } from "@/lib/production-completion/monitoringDashboard";
import { isProductionKillSwitchActive } from "@/lib/production-kill-switch";
import { evaluateInterCarsProductionAccess } from "@/lib/supplier-inter-cars-production-access/diagnostic";
import { getProductionAccessDashboard } from "@/lib/supplier-inter-cars-production-access/admin";
import { evaluateInterCarsFlow } from "@/lib/final-closure/interCarsFlow";
import { evaluateProviderOperations } from "./providerOps";
import { evaluateFinancialReconciliation } from "./financialReconciliation";
import type { OpsSectionStatus } from "./types";

export interface FinalSalesGateResult {
  allowed: boolean;
  salesEnabled: "OPEN" | "CLOSED";
  finalGoLive: "READY" | "BLOCKED";
  blockers: string[];
  gates: Record<string, OpsSectionStatus>;
}

export function evaluateFinalOperationsSalesGate(): FinalSalesGateResult {
  const blockers: string[] = [];
  const gates: Record<string, OpsSectionStatus> = {};

  const flow = evaluateInterCarsFlow();
  const stageA = flow.find((f) => f.stage === "A");
  const interCars = evaluateInterCarsProductionAccess();
  const dash = getProductionAccessDashboard();
  const providers = evaluateProviderOperations();
  const financial = evaluateFinancialReconciliation();
  const backup = getBackupRestoreEvidence();
  const security = evaluateFinalSecurityGate();
  const monitoring = buildProductionMonitoringSnapshot();

  gates.INTER_CARS_READ_VALIDATION = stageA?.status === "PASS" ? "PASS" : "UNVERIFIED";
  gates.CREATE_ORDER = interCars.createOrderCapability === "VALIDATED" ? "PASS" : "UNVERIFIED";
  gates.FIRST_ORDER = dash.firstOrderState === "EXECUTED" ? "PASS" : "BLOCKED";
  gates.CONTROLLED_GO_LIVE = dash.controlledGoLive === "ACTIVE" ? "PASS" : "BLOCKED";
  gates.OBSERVATION = String(dash.observationState).includes("COMPLETED") ? "PASS" : "BLOCKED";
  gates.PAYMENT = providers.payment;
  gates.CARRIER = providers.carrier;
  gates.AI = providers.ai;
  gates.RETURNS = providers.returns;
  gates.MARKETING = providers.marketing;
  gates.FINANCIAL_RECONCILIATION = financial.status;
  gates.BACKUP_RESTORE = backup.result === "PASS" ? "PASS" : backup.result === "BLOCKED" ? "BLOCKED" : "UNVERIFIED";
  gates.SECURITY = security.status;
  gates.MONITORING = monitoring.healthStatus === "HEALTHY" ? "PASS" : monitoring.healthStatus === "CRITICAL" ? "BLOCKED" : "UNVERIFIED";

  for (const [gate, status] of Object.entries(gates)) {
    if (status !== "PASS") blockers.push(`${gate}_NOT_PASS`);
  }

  if (countRejectedEvidenceAttempts() > 0) blockers.push("FAKE_EVIDENCE");
  if (isProductionKillSwitchActive()) blockers.push("KILL_SWITCH_ACTIVE");

  const envSales = isProductionFlagEnabled("SALES");
  const allowed = blockers.length === 0;

  return {
    allowed,
    salesEnabled: envSales && allowed ? "OPEN" : "CLOSED",
    finalGoLive: allowed ? "READY" : "BLOCKED",
    blockers: [...new Set(blockers)],
    gates,
  };
}
