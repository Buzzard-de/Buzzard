import { getFinalGoLiveSafetyCounters } from "@/lib/final-production-go-live/safety";
import { countRejectedEvidenceAttempts } from "@/lib/final-closure/evidencePolicy";
import { getBackupRestoreEvidence } from "@/lib/final-closure/backupRestore";
import { evaluateFinalSecurityGate } from "@/lib/final-closure/securityGate";
import { buildProductionMonitoringSnapshot } from "@/lib/production-completion/monitoringDashboard";
import { getCriticalBlockers, buildFinalBlockerRegistry } from "@/lib/final-closure/blockerRegistry";
import { evaluateInterCarsProductionAccess } from "@/lib/supplier-inter-cars-production-access/diagnostic";
import { getProductionAccessDashboard } from "@/lib/supplier-inter-cars-production-access/admin";
import { evaluateInterCarsFlow } from "@/lib/final-closure/interCarsFlow";
import { detectCredentialMetadata, getInterCarsCredentialMeta } from "./credentialDetection";
import { buildOperationsChain } from "./chainOrchestrator";
import { evaluateProviderOperations } from "./providerOps";
import { evaluateFinancialReconciliation } from "./financialReconciliation";
import { evaluateFinalOperationsSalesGate } from "./salesGate";
import type { FinalOperationsReport, OpsSectionStatus } from "./types";

function readStatus(flow: ReturnType<typeof evaluateInterCarsFlow>, stage: string): OpsSectionStatus {
  const s = flow.find((f) => f.stage === stage)?.status;
  if (s === "PASS") return "PASS";
  if (s === "NOT_CONFIGURED") return "NOT_CONFIGURED";
  if (s === "BLOCKED") return "BLOCKED";
  return "UNVERIFIED";
}

export function buildFinalOperationsReport(): FinalOperationsReport {
  const flow = evaluateInterCarsFlow();
  const dash = getProductionAccessDashboard();
  const interCars = evaluateInterCarsProductionAccess();
  const providers = evaluateProviderOperations();
  const financial = evaluateFinancialReconciliation();
  const backup = getBackupRestoreEvidence();
  const security = evaluateFinalSecurityGate();
  const monitoring = buildProductionMonitoringSnapshot();
  const salesGate = evaluateFinalOperationsSalesGate();
  const sideEffects = getFinalGoLiveSafetyCounters();
  const critical = getCriticalBlockers(buildFinalBlockerRegistry());
  const credMeta = getInterCarsCredentialMeta();

  const operationalBlockers = critical.map((b) => b.code);

  return {
    generatedAt: new Date().toISOString(),
    softwareComplete: true,
    operationalBlockers,
    interCarsCredential: credMeta === "MISSING" ? "MISSING" : credMeta === "CONFIGURED" ? "CONFIGURED" : credMeta,
    interCarsRead: readStatus(flow, "A"),
    createOrder342: interCars.createOrderCapability === "VALIDATED" ? "PASS" : "UNVERIFIED",
    arming343: dash.armingState === "ARMED" ? "PASS" : "BLOCKED",
    firstOrder344: dash.firstOrderState === "EXECUTED" ? "PASS" : "BLOCKED",
    controlledGoLive345: dash.controlledGoLive === "ACTIVE" ? "PASS" : "BLOCKED",
    observation346: String(dash.observationState).includes("COMPLETED") ? "PASS" : "BLOCKED",
    payment: providers.payment,
    carrier: providers.carrier,
    ai: providers.ai,
    returns: providers.returns,
    marketing: providers.marketing,
    financialReconciliation: financial.status,
    backupRestore: backup.result === "PASS" ? "PASS" : backup.result === "BLOCKED" ? "BLOCKED" : "UNVERIFIED",
    security: security.status,
    monitoring: monitoring.healthStatus === "HEALTHY" ? "PASS" : monitoring.healthStatus === "CRITICAL" ? "BLOCKED" : "UNVERIFIED",
    sales: salesGate.salesEnabled,
    finalGoLive: salesGate.finalGoLive,
    realSideEffects: sideEffects as unknown as Record<string, number>,
    fakeEvidenceCount: countRejectedEvidenceAttempts(),
    criticalBlockers: critical.length,
    chain: buildOperationsChain(),
    credentials: detectCredentialMetadata(),
  };
}

export function formatFinalOperationsReport(report: FinalOperationsReport): string {
  const lines = [
    "========================================",
    "BUZZARD FINAL OPERATIONS",
    "========================================",
    `SOFTWARE: COMPLETE`,
    `OPERATIONAL BLOCKERS: ${report.operationalBlockers.length}`,
    "",
    `INTER CARS CREDENTIAL: ${report.interCarsCredential}`,
    `INTER CARS READ: ${report.interCarsRead}`,
    `CREATE ORDER #342: ${report.createOrder342}`,
    `#343 ARMING: ${report.arming343 === "PASS" ? "ARMED" : "BLOCKED"}`,
    `#344 FIRST ORDER: ${report.firstOrder344 === "PASS" ? "EXECUTED" : "BLOCKED"}`,
    `#345 CONTROLLED GO-LIVE: ${report.controlledGoLive345 === "PASS" ? "ACTIVE" : "BLOCKED"}`,
    `#346 OBSERVATION: ${report.observation346 === "PASS" ? "COMPLETED" : "BLOCKED"}`,
    `PAYMENT: ${report.payment}`,
    `CARRIER: ${report.carrier}`,
    `AI: ${report.ai}`,
    `RETURNS: ${report.returns}`,
    `MARKETING: ${report.marketing}`,
    `FINANCIAL RECONCILIATION: ${report.financialReconciliation}`,
    `BACKUP RESTORE: ${report.backupRestore}`,
    `SECURITY: ${report.security}`,
    `MONITORING: ${report.monitoring}`,
    `SALES: ${report.sales}`,
    `FINAL GO-LIVE: ${report.finalGoLive}`,
    "",
    "REAL SIDE EFFECTS:",
    `  ORDERS: ${report.realSideEffects.realSupplierOrders || 0}`,
    `  PAYMENTS: ${report.realSideEffects.realPayments || 0}`,
    `  SHIPMENTS: ${report.realSideEffects.realCarrierLabels || 0}`,
    `  REFUNDS: ${report.realSideEffects.realRefunds || 0}`,
    `  MARKETING SPEND: ${report.realSideEffects.realMarketingSpend || 0}`,
    `FAKE EVIDENCE: ${report.fakeEvidenceCount}`,
    `CRITICAL BLOCKERS: ${report.criticalBlockers}`,
    "========================================",
  ];
  return lines.join("\n");
}
