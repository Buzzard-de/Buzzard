import { isProductionFlagEnabled } from "@/lib/production-defaults";
import { evaluateAiProviderState, evaluateMarketingProviderState } from "@/lib/production-access/providerRegistry";
import { resolveGenericSecretRef } from "@/lib/production-access/secretRefs";
import { MARKETING_PROVIDERS } from "@/lib/final-production-go-live/config";
import type { ControlCenterStatus } from "@/lib/external-access-control-center/types";
import { resolveCredentialDisplayState } from "./credentialState";
import { hasExternalLiveEvidence } from "./externalProviderEvidenceStore";
import type { MasterProviderMatrixRow } from "./types";

export function buildAiMasterRows(): MasterProviderMatrixRow[] {
  const state = evaluateAiProviderState();
  const generic = resolveGenericSecretRef({
    providerId: "ai",
    secretRefEnvKey: "AI_PROVIDER_SECRET_REF",
    fallbackEnvKey: "AI_PROVIDER_SECRET",
  });
  const cred = resolveCredentialDisplayState({
    secretRefConfigured: generic.secretRefConfigured,
    secretResolvable: generic.secretResolvable,
    category: "AI",
    providerId: "ai",
    configuredFlag: state.credentialConfigured,
  });
  const live: ControlCenterStatus = hasExternalLiveEvidence("AI", "ai", "health") ? "VALIDATED" : "UNVERIFIED_EXTERNAL";
  return [
    {
      provider: "AI",
      category: "AI",
      required: false,
      configured: state.endpointConfigured ?? false,
      secretRef: generic.secretRefKey,
      credentialState: cred,
      networkState: isProductionFlagEnabled("AI_PRODUCTION") ? "FAILED" : "DISABLED",
      liveValidation: live,
      productionEvidence: live === "VALIDATED" ? "VALIDATED" : "NONE",
      humanApproval: true,
      blocking: true,
      nextHumanAction: "AI provider SecretRef — no secrets in AI context; production network off",
    },
  ];
}

export function buildMarketingMasterRows(): MasterProviderMatrixRow[] {
  const state = evaluateMarketingProviderState();
  const rows: MasterProviderMatrixRow[] = [];
  for (const mp of MARKETING_PROVIDERS) {
    const envKey = `${mp.toUpperCase()}_SECRET_REF`.replace("MARKETPLACE_FEEDS", "MARKETPLACE_FEEDS");
    const refKey = mp === "google_ads" ? "GOOGLE_ADS_SECRET_REF" : `${mp.toUpperCase()}_SECRET_REF`;
    const configured = Boolean(process.env[refKey]?.trim());
    const cred = resolveCredentialDisplayState({
      secretRefConfigured: configured,
      secretResolvable: false,
      category: "MARKETING",
      providerId: mp,
      configuredFlag: configured,
    });
    rows.push({
      provider: mp.toUpperCase(),
      category: "MARKETING",
      required: false,
      configured,
      secretRef: configured ? `env:${refKey}` : "env:MARKETING_PROVIDER_SECRET_REF",
      credentialState: cred,
      networkState: isProductionFlagEnabled("MARKETING_SPEND") ? "FAILED" : "DISABLED",
      liveValidation: "UNVERIFIED_EXTERNAL",
      productionEvidence: "NONE",
      humanApproval: true,
      blocking: true,
      nextHumanAction: "Marketing spend OFF — configure account only, no campaign activation",
    });
  }
  if (rows.length === 0) {
    rows.push({
      provider: "MARKETING",
      category: "MARKETING",
      required: false,
      configured: state.credentialConfigured,
      secretRef: "env:GOOGLE_ADS_SECRET_REF",
      credentialState: "NOT_CONFIGURED",
      networkState: "DISABLED",
      liveValidation: "UNVERIFIED_EXTERNAL",
      productionEvidence: "NONE",
      humanApproval: true,
      blocking: true,
      nextHumanAction: "Configure marketing provider credentials",
    });
  }
  return rows;
}
