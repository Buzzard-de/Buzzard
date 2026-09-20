import { buildExternalAccessControlCenterReport } from "@/lib/external-access-control-center/controlCenterReport";
import { buildMasterExternalProviderReadinessReport } from "@/lib/master-external-provider-readiness/masterReadinessReport";
import { countRejectedEvidenceAttempts } from "@/lib/production-access/evidencePolicy";
import { getFinalGoLiveSafetyCounters } from "@/lib/final-production-go-live/safety";
import { getProductionFlagsSnapshot } from "@/lib/production-defaults";
import { buildRenderPersistenceVerificationReport } from "@/lib/render-persistence-evidence-bridge/renderPersistenceReport";
import { auditAiWorkerRegistry } from "@/lib/ai-workers/workerRegistryAudit";
import { buildMarketplaceProductionCapabilityMatrix } from "@/lib/marketplace-engine/productionCapabilityMatrix";
import { executeMasterFinalPhasesInOrder } from "./phaseExecution";
import { buildFinalHumanActionMatrix } from "./humanActionMatrix";
import { buildTestCoverageMatrix } from "./testCoverageMatrix";
import type { MasterFinalCompletionReport } from "./types";

export function buildMasterFinalCompletionReport(): MasterFinalCompletionReport {
  process.env.SALES_ENABLED = process.env.SALES_ENABLED ?? "0";

  const chain = executeMasterFinalPhasesInOrder();
  const workerAudit = auditAiWorkerRegistry();
  const marketplaceCells = buildMarketplaceProductionCapabilityMatrix();
  const external = buildMasterExternalProviderReadinessReport();
  const control = buildExternalAccessControlCenterReport();
  const render = buildRenderPersistenceVerificationReport();
  const flags = getProductionFlagsSnapshot();
  const sideEffectSource = getFinalGoLiveSafetyCounters();

  const blockers = [
    ...chain.phases.flatMap((p) => p.blockers.map((b) => `${p.phase}:${b}`)),
    ...external.blockers.map((b) => b.id ?? b.reason),
  ];

  const humanActionMatrix = buildFinalHumanActionMatrix();
  const humanRequiredCount = humanActionMatrix.filter((h) => h.blocking).length;

  const scoreboard: Record<string, string> = {
    SOFTWARE: external.scoreboard.SOFTWARE ?? "VALIDATED",
    CONFIGURATION: external.scoreboard.CONFIGURATION ?? "CONFIGURED",
    INTERNAL_INTEGRATION: chain.phaseInputsValid ? "COMPLETE" : "BLOCKED",
    PERSISTENCE: String(render.live.PERSISTENCE),
    EXTERNAL_ACCESS: String(external.scoreboard.EXTERNAL_ACCESS),
    LIVE_VALIDATION: String(external.scoreboard.LIVE_VALIDATION),
    SUPPLIER: String(external.scoreboard.INTER_CARS),
    PAYMENT: String(external.scoreboard.PAYMENT),
    CARRIER: String(external.scoreboard.CARRIER),
    RETURNS: String(external.scoreboard.RETURNS),
    MARKETPLACE: String(external.scoreboard.MARKETPLACE),
    AI: String(external.scoreboard.AI),
    MARKETING: String(external.scoreboard.MARKETING),
    "35_MARKETS": String(external.scoreboard.MARKETS_35),
    CUSTOMS: String(external.scoreboard.CUSTOMS),
    CHECKOUT: String(external.scoreboard.CHECKOUT),
    MEMORY: chain.phases.find((p) => p.phase === "B")?.status === "COMPLETE" ? "CONFIGURED" : "HUMAN_REQUIRED",
    HUMAN_APPROVAL: "HUMAN_REQUIRED",
    EXCEPTION: "CONFIGURED",
    SECURITY: chain.phases.find((p) => p.phase === "E")?.status ?? "HUMAN_REQUIRED",
    BACKUP: String(external.scoreboard.BACKUP),
    E2E_TEST: chain.phases.find((p) => p.phase === "D")?.status ?? "BLOCKED",
    FIRST_ORDER: "BLOCKED_EXTERNAL_ACCESS",
    OBSERVATION: "BLOCKED",
    PRODUCTION: "BLOCKED",
    GO_LIVE: "BLOCKED",
    SALES: flags.SALES === "ON" ? "FAILED" : "DISABLED",
  };

  const nextHumanAction =
    control.nextHumanActions?.[0]?.action ??
    external.nextHumanActions[0]?.action ??
    "Create/mount Persistent Disk on buzzard-api — path /var/data";

  return {
    generatedAt: new Date().toISOString(),
    executionOrder: chain.executionOrder,
    phases: chain.phases,
    scoreboard,
    dependencyGraph: chain.dependencyGraph,
    testCoverage: buildTestCoverageMatrix(),
    humanActionMatrix,
    sideEffects: {
      realSupplierOrders: sideEffectSource.realSupplierOrders,
      realCustomerOrders: 0,
      realPayments: sideEffectSource.realPayments,
      realRefunds: sideEffectSource.realRefunds,
      realShipments: sideEffectSource.realCarrierLabels,
      realLabels: sideEffectSource.realCarrierLabels,
      realMarketplaceListings: sideEffectSource.realMarketplaceMutations,
      realMarketplaceOrders: 0,
      realAdSpend: sideEffectSource.realMarketingSpend,
      productionDeployments: 0,
      externalMutations: 0,
    },
    fakeProductionEvidence: countRejectedEvidenceAttempts(),
    humanRequiredCount,
    blockers: [...new Set(blockers)],
    nextHumanAction,
    SALES_ENABLED: flags.SALES === "ON" ? "1" : "0",
    phaseInputsValid: chain.phaseInputsValid,
    workerRegistryAudit: { ok: workerAudit.ok, workerCount: workerAudit.rows.length },
    marketplaceCapabilityCells: marketplaceCells.length,
  };
}

export function formatMasterFinalCompletionBanner(report: MasterFinalCompletionReport): string {
  const lines = [
    "BUZZARD MASTER FINAL COMPLETION",
    "================================",
    `SOFTWARE = ${report.scoreboard.SOFTWARE}`,
    `INTERNAL_INTEGRATION = ${report.scoreboard.INTERNAL_INTEGRATION}`,
    `EXTERNAL_ACCESS = ${report.scoreboard.EXTERNAL_ACCESS}`,
    `LIVE_VALIDATION = ${report.scoreboard.LIVE_VALIDATION}`,
    `SECURITY = ${report.scoreboard.SECURITY}`,
    `HUMAN_APPROVAL = ${report.scoreboard.HUMAN_APPROVAL}`,
    `PRODUCTION = ${report.scoreboard.PRODUCTION}`,
    `GO_LIVE = ${report.scoreboard.GO_LIVE}`,
    `SALES_ENABLED = ${report.SALES_ENABLED}`,
    `HUMAN_REQUIRED = ${report.humanRequiredCount} action(s)`,
    `BLOCKERS = ${report.blockers.length}`,
    `NEXT_HUMAN_ACTION = ${report.nextHumanAction}`,
    `FAKE_PRODUCTION_EVIDENCE = ${report.fakeProductionEvidence}`,
    `REAL_SIDE_EFFECTS = ${Object.values(report.sideEffects).reduce((a, b) => a + b, 0)}`,
  ];
  return lines.join("\n");
}
