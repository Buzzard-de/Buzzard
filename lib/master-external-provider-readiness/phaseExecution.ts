/**
 * Master external readiness — mandatory internal execution order:
 * #363 → #364 → #365 → #366 (each phase consumes prior phase output).
 */
import type { ControlCenterStatus } from "@/lib/external-access-control-center/types";
import { buildInterCarsProductionAccessBridgeReport } from "@/lib/inter-cars-production-access-evidence-bridge/accessReport";
import { buildRenderPersistenceVerificationReport } from "@/lib/render-persistence-evidence-bridge/renderPersistenceReport";
import { buildAiMasterRows, buildMarketingMasterRows } from "./aiMarketingReadiness";
import { buildCarrierMasterRows, buildPaymentMasterRows, buildReturnsMasterRows } from "./paymentCarrierReturnsReadiness";
import { buildMarketplaceMasterRows, marketplaceScoreboardStatus } from "./marketplaceReadiness";
import { rowScore } from "./masterProviderMatrix";
import type { MasterProviderMatrixRow } from "./types";

export interface Phase363Result {
  phase: "363";
  foundationRows: MasterProviderMatrixRow[];
  operationalRows: MasterProviderMatrixRow[];
  scores: { PAYMENT: ControlCenterStatus; CARRIER: ControlCenterStatus; RETURNS: ControlCenterStatus };
}

export interface Phase364Result {
  phase: "364";
  prior: Phase363Result;
  marketplaceRows: MasterProviderMatrixRow[];
  score: ControlCenterStatus;
}

export interface Phase365Result {
  phase: "365";
  prior: Phase364Result;
  aiMarketingRows: MasterProviderMatrixRow[];
  scores: { AI: ControlCenterStatus; MARKETING: ControlCenterStatus };
}

export interface Phase366Result {
  phase: "366";
  prior: Phase365Result;
  masterMatrix: MasterProviderMatrixRow[];
  scores: Record<string, ControlCenterStatus>;
}

function buildFoundationRows(): MasterProviderMatrixRow[] {
  const render = buildRenderPersistenceVerificationReport();
  const interCars = buildInterCarsProductionAccessBridgeReport();
  return [
    {
      provider: "RENDER",
      category: "RENDER",
      required: true,
      configured: render.live.BLUEPRINT_CONFIGURATION === "VALIDATED",
      secretRef: "n/a",
      credentialState: render.live.BLUEPRINT_CONFIGURATION === "VALIDATED" ? "CONFIGURED" : "NOT_CONFIGURED",
      networkState: "DISABLED",
      liveValidation: render.live.LIVE_RENDER_DISK === "VALIDATED" ? "VALIDATED" : "UNVERIFIED_EXTERNAL",
      productionEvidence: render.live.LIVE_RENDER_DISK === "VALIDATED" ? "VALIDATED" : "NONE",
      humanApproval: true,
      blocking: render.live.PERSISTENCE !== "VALIDATED",
      nextHumanAction: render.nextHumanAction ?? "Render persistent disk live verification",
    },
    {
      provider: "INTER_CARS",
      category: "SUPPLIER",
      required: true,
      configured: interCars.credentialReference !== "NOT_CONFIGURED",
      secretRef: "env:SUPPLIER_LIVE_CREDENTIALS_SECRET_REF",
      credentialState:
        interCars.credentialReference === "VALIDATED"
          ? "VALIDATED"
          : interCars.credentialReference === "REFERENCE_PRESENT"
            ? "REFERENCE_PRESENT"
            : interCars.credentialReference === "NOT_CONFIGURED"
              ? "NOT_CONFIGURED"
              : "CONFIGURED",
      networkState: "DISABLED",
      liveValidation: interCars.readOnlyAccess === "VALIDATED" ? "VALIDATED" : "BLOCKED_EXTERNAL_ACCESS",
      productionEvidence: interCars.stage342Gate === "VALIDATED" ? "PARTIAL" : "NONE",
      humanApproval: true,
      blocking: interCars.stage342Gate !== "VALIDATED",
      nextHumanAction: interCars.nextHumanAction ?? "Inter Cars production credentials",
    },
  ];
}

/** #363 — Payment + Carrier + Returns (uses #360–#362 foundation only). */
export function executePhase363PaymentCarrierReturns(): Phase363Result {
  const foundationRows = buildFoundationRows();
  const operationalRows = [
    ...buildPaymentMasterRows(),
    ...buildCarrierMasterRows(),
    ...buildReturnsMasterRows(),
  ];
  const partialMatrix = [...foundationRows, ...operationalRows];
  return {
    phase: "363",
    foundationRows,
    operationalRows,
    scores: {
      PAYMENT: rowScore(partialMatrix, "PAYMENT"),
      CARRIER: rowScore(partialMatrix, "CARRIER"),
      RETURNS: rowScore(partialMatrix, "RETURNS"),
    },
  };
}

/** #364 — Marketplace (input = completed #363 repository state). */
export function executePhase364MarketplaceAccess(phase363: Phase363Result): Phase364Result {
  const marketplaceRows = buildMarketplaceMasterRows();
  const partialMatrix = [...phase363.foundationRows, ...phase363.operationalRows, ...marketplaceRows];
  return {
    phase: "364",
    prior: phase363,
    marketplaceRows,
    score: marketplaceScoreboardStatus(marketplaceRows),
  };
}

/** #365 — AI + Marketing (input = #363 + #364 state). */
export function executePhase365AiMarketing(phase364: Phase364Result): Phase365Result {
  const aiMarketingRows = [...buildAiMasterRows(), ...buildMarketingMasterRows()];
  const partialMatrix = [
    ...phase364.prior.foundationRows,
    ...phase364.prior.operationalRows,
    ...phase364.marketplaceRows,
    ...aiMarketingRows,
  ];
  return {
    phase: "365",
    prior: phase364,
    aiMarketingRows,
    scores: {
      AI: rowScore(partialMatrix, "AI"),
      MARKETING: rowScore(partialMatrix, "MARKETING"),
    },
  };
}

/** #366 — Consolidation + handoff (input = full #365 state). */
export function executePhase366FinalConsolidation(phase365: Phase365Result): Phase366Result {
  const masterMatrix = [
    ...phase365.prior.prior.foundationRows,
    ...phase365.prior.prior.operationalRows,
    ...phase365.prior.marketplaceRows,
    ...phase365.aiMarketingRows,
  ];
  return {
    phase: "366",
    prior: phase365,
    masterMatrix,
    scores: {
      RENDER: rowScore(masterMatrix, "RENDER"),
      INTER_CARS: rowScore(masterMatrix, "INTER_CARS"),
      PAYMENT: phase365.prior.prior.scores.PAYMENT,
      CARRIER: phase365.prior.prior.scores.CARRIER,
      RETURNS: phase365.prior.prior.scores.RETURNS,
      MARKETPLACE: phase365.prior.score,
      AI: phase365.scores.AI,
      MARKETING: phase365.scores.MARKETING,
    },
  };
}

/** Runs #363 → #364 → #365 → #366 strictly in order. */
export function executeMasterExternalPhasesInOrder(): Phase366Result {
  const p363 = executePhase363PaymentCarrierReturns();
  const p364 = executePhase364MarketplaceAccess(p363);
  const p365 = executePhase365AiMarketing(p364);
  return executePhase366FinalConsolidation(p365);
}
