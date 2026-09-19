import { listMarketplaces } from "@/lib/marketplace-engine/registry";
import { hasProductionEvidence } from "@/lib/production-access/evidenceStore";
import type { ControlCenterStatus } from "@/lib/external-access-control-center/types";
import { resolveCredentialDisplayState } from "./credentialState";
import { hasExternalLiveEvidence } from "./externalProviderEvidenceStore";
import type { MasterProviderMatrixRow } from "./types";

function mpSecretRef(marketplaceId: string): string {
  const key = `MARKETPLACE_${marketplaceId.toUpperCase().replace(/-/g, "_")}_SECRET_REF`;
  const configured = Boolean(process.env[key]?.trim());
  return configured ? `env:${key}` : "env:MARKETPLACE_PROVIDER_SECRET_REF";
}

export function buildMarketplaceMasterRows(): MasterProviderMatrixRow[] {
  const marketplaces = listMarketplaces();
  return marketplaces.map((mp) => {
    const secretRef = mpSecretRef(mp.marketplaceId);
    const secretRefConfigured = secretRef.startsWith("env:MARKETPLACE_") && process.env[secretRef.slice(4)]?.trim();
    const cred = resolveCredentialDisplayState({
      secretRefConfigured: Boolean(secretRefConfigured),
      secretResolvable: false,
      category: "MARKETPLACE",
      providerId: mp.marketplaceId,
      configuredFlag: mp.status !== "DISCOVERED",
    });
    const live: ControlCenterStatus =
      hasExternalLiveEvidence("MARKETPLACE", mp.marketplaceId, "catalog_read") ||
      hasProductionEvidence("marketplace", mp.marketplaceId.toLowerCase())
        ? "VALIDATED"
        : "UNVERIFIED_EXTERNAL";
    return {
      provider: mp.displayName.toUpperCase(),
      category: "MARKETPLACE",
      required: false,
      configured: mp.capabilities.api || mp.connectorType !== "dry-run",
      secretRef,
      credentialState: cred,
      networkState: "DISABLED",
      liveValidation: live,
      productionEvidence: live === "VALIDATED" ? "VALIDATED" : "NONE",
      humanApproval: true,
      blocking: live !== "VALIDATED",
      nextHumanAction: "Marketplace credentials + dry-run only until explicit live evidence",
    };
  });
}

export function marketplaceScoreboardStatus(rows: MasterProviderMatrixRow[]): ControlCenterStatus {
  if (rows.length === 0) return "NOT_CONFIGURED";
  if (rows.some((r) => r.liveValidation === "VALIDATED")) return "HUMAN_REQUIRED";
  if (rows.every((r) => r.credentialState === "NOT_CONFIGURED")) return "NOT_CONFIGURED";
  return "UNVERIFIED_EXTERNAL";
}
