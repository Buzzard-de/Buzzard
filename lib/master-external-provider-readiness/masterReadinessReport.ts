import { getProductionFlagsSnapshot } from "@/lib/production-defaults";
import { getFinalGoLiveSafetyCounters } from "@/lib/final-production-go-live/safety";
import { countRejectedEvidenceAttempts } from "@/lib/production-access/evidencePolicy";
import { buildExternalAccessPreflightReport } from "@/lib/final-external-access/preflightReport";
import { buildRenderPersistenceVerificationReport } from "@/lib/render-persistence-evidence-bridge/renderPersistenceReport";
import type { ControlCenterStatus } from "@/lib/external-access-control-center/types";
import { buildExternalBlockers } from "./blockerEngine";
import { buildMasterExternalHumanActions } from "./humanActionsMaster";
import { executeMasterExternalPhasesInOrder } from "./phaseExecution";
import { summarizeMarket35ProviderImpact } from "./market35ProviderImpact";
import type { MasterExternalProviderReadinessReport } from "./types";

export function buildMasterExternalProviderReadinessReport(): MasterExternalProviderReadinessReport {
  const preflight = buildExternalAccessPreflightReport();
  const phase366 = executeMasterExternalPhasesInOrder();
  const matrix = phase366.masterMatrix;
  const blockers = buildExternalBlockers(matrix);
  const nextHumanActions = buildMasterExternalHumanActions(matrix);
  const flags = getProductionFlagsSnapshot();
  const sideEffects = getFinalGoLiveSafetyCounters();
  const render = buildRenderPersistenceVerificationReport();
  const p363 = phase366.prior.prior.prior;
  const p364 = phase366.prior.prior;
  const p365 = phase366.prior;

  const phases: MasterExternalProviderReadinessReport["phases"] = [
    {
      phase: "363",
      complete: true,
      summary: {
        PAYMENT: p363.scores.PAYMENT,
        CARRIER: p363.scores.CARRIER,
        RETURNS: p363.scores.RETURNS,
      },
    },
    {
      phase: "364",
      complete: true,
      summary: { MARKETPLACE: p364.score },
    },
    {
      phase: "365",
      complete: true,
      summary: { AI: p365.scores.AI, MARKETING: p365.scores.MARKETING },
    },
    {
      phase: "366",
      complete: true,
      summary: {
        EXTERNAL_ACCESS: "HUMAN_REQUIRED",
        LIVE_VALIDATION: "BLOCKED",
        PRODUCTION: "BLOCKED",
        GO_LIVE: "BLOCKED",
      },
    },
  ];

  const scoreboard: Record<string, ControlCenterStatus | string> = {
    SOFTWARE: preflight.softwareComplete ? "VALIDATED" : "BLOCKED",
    CONFIGURATION: preflight.configComplete ? "CONFIGURED" : "UNVERIFIED_EXTERNAL",
    PERSISTENCE: render.live.PERSISTENCE,
    EXTERNAL_ACCESS: "HUMAN_REQUIRED",
    LIVE_VALIDATION: "BLOCKED",
    PRODUCTION: "BLOCKED",
    GO_LIVE: "BLOCKED",
    SALES: flags.SALES === "ON" ? "FAILED" : "DISABLED",
    RENDER: phase366.scores.RENDER,
    INTER_CARS: phase366.scores.INTER_CARS,
    PAYMENT: phase366.scores.PAYMENT,
    CARRIER: phase366.scores.CARRIER,
    RETURNS: phase366.scores.RETURNS,
    MARKETPLACE: phase366.scores.MARKETPLACE,
    AI: phase366.scores.AI,
    MARKETING: phase366.scores.MARKETING,
    MARKETS_35: "PARTIAL",
    CUSTOMS: "UNVERIFIED_EXTERNAL",
    CHECKOUT: "CONFIGURED",
    SECURITY: "UNVERIFIED_EXTERNAL",
    BACKUP: "UNVERIFIED_EXTERNAL",
    HUMAN_APPROVAL: "HUMAN_REQUIRED",
    FIRST_ORDER: "BLOCKED_EXTERNAL_ACCESS",
    OBSERVATION: "BLOCKED_EXTERNAL_ACCESS",
  };

  return {
    generatedAt: new Date().toISOString(),
    executionOrder: ["363", "364", "365", "366"],
    phases,
    scoreboard,
    masterMatrix: matrix,
    blockers,
    nextHumanActions,
    market35ProviderImpact: summarizeMarket35ProviderImpact(),
    fakeProductionEvidence: countRejectedEvidenceAttempts(),
    sideEffects: {
      realSupplierOrders: sideEffects.realSupplierOrders,
      realCustomerOrders: 0,
      realPayments: sideEffects.realPayments,
      realRefunds: sideEffects.realRefunds,
      realShipments: sideEffects.realCarrierLabels,
      realLabels: sideEffects.realCarrierLabels,
      realMarketplaceListings: 0,
      realMarketplaceOrders: sideEffects.realMarketplaceMutations,
      realAdSpend: sideEffects.realMarketingSpend,
      productionDeployments: 0,
      externalMutations: 0,
    },
  };
}

export function formatMasterExternalReadinessBanner(report: MasterExternalProviderReadinessReport): string {
  const s = report.scoreboard;
  return [
    "BUZZARD MASTER EXTERNAL PROVIDER READINESS",
    "==========================================",
    `SOFTWARE = ${s.SOFTWARE === "VALIDATED" ? "COMPLETE" : s.SOFTWARE}`,
    `CONFIGURATION = ${s.CONFIGURATION}`,
    `PERSISTENCE = ${s.PERSISTENCE}`,
    `EXTERNAL_ACCESS = ${s.EXTERNAL_ACCESS}`,
    `LIVE_VALIDATION = ${s.LIVE_VALIDATION}`,
    `PRODUCTION = ${s.PRODUCTION}`,
    `GO_LIVE = ${s.GO_LIVE}`,
    `SALES_ENABLED = ${report.scoreboard.SALES === "DISABLED" ? "0" : "1"}`,
    `RENDER = ${s.RENDER}`,
    `INTER_CARS = ${s.INTER_CARS}`,
    `PAYMENT = ${s.PAYMENT}`,
    `CARRIER = ${s.CARRIER}`,
    `RETURNS = ${s.RETURNS}`,
    `MARKETPLACE = ${s.MARKETPLACE}`,
    `AI = ${s.AI}`,
    `MARKETING = ${s.MARKETING}`,
    `35_MARKETS = ${s.MARKETS_35}`,
    `HUMAN_REQUIRED = ${report.nextHumanActions.length} action(s)`,
    `BLOCKERS = ${report.blockers.length}`,
    `NEXT_HUMAN_ACTION = ${report.nextHumanActions[0]?.action ?? "—"}`,
    `FAKE_PRODUCTION_EVIDENCE = ${report.fakeProductionEvidence}`,
    `REAL_SIDE_EFFECTS = ${Object.values(report.sideEffects).reduce((a, b) => a + b, 0)}`,
  ].join("\n");
}
