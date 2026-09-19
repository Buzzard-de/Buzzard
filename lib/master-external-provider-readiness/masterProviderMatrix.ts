import { buildInterCarsProductionAccessBridgeReport } from "@/lib/inter-cars-production-access-evidence-bridge/accessReport";
import { buildRenderPersistenceVerificationReport } from "@/lib/render-persistence-evidence-bridge/renderPersistenceReport";
import type { ControlCenterStatus } from "@/lib/external-access-control-center/types";
import { buildAiMasterRows, buildMarketingMasterRows } from "./aiMarketingReadiness";
import { buildCarrierMasterRows, buildPaymentMasterRows, buildReturnsMasterRows } from "./paymentCarrierReturnsReadiness";
import { buildMarketplaceMasterRows } from "./marketplaceReadiness";
import type { MasterProviderMatrixRow } from "./types";

export function buildMasterProviderMatrix(): MasterProviderMatrixRow[] {
  const render = buildRenderPersistenceVerificationReport();
  const interCars = buildInterCarsProductionAccessBridgeReport();

  const renderRow: MasterProviderMatrixRow = {
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
  };

  const interCarsRow: MasterProviderMatrixRow = {
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
  };

  return [
    renderRow,
    interCarsRow,
    ...buildPaymentMasterRows(),
    ...buildCarrierMasterRows(),
    ...buildReturnsMasterRows(),
    ...buildMarketplaceMasterRows(),
    ...buildAiMasterRows(),
    ...buildMarketingMasterRows(),
  ];
}

export function rowScore(rows: MasterProviderMatrixRow[], provider: string): ControlCenterStatus {
  const match = rows.filter((r) => r.provider === provider || (provider.length <= 12 && r.category === provider && r.provider === provider));
  const categoryMatch = rows.filter((r) => r.category === provider);
  const use = match.length ? match : categoryMatch;
  if (use.length === 0) return "NOT_CONFIGURED";
  const primary = use.find((r) => r.provider === provider) ?? use[0];
  if (primary.liveValidation === "VALIDATED") return "VALIDATED";
  if (primary.credentialState === "REFERENCE_PRESENT") return "HUMAN_REQUIRED";
  if (primary.credentialState === "NOT_CONFIGURED") return "NOT_CONFIGURED";
  if (primary.credentialState === "CONFIGURED") return "UNVERIFIED_EXTERNAL";
  return "BLOCKED_EXTERNAL_ACCESS";
}
