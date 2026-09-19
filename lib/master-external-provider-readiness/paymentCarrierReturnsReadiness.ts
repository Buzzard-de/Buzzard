import { isProductionFlagEnabled } from "@/lib/production-defaults";
import {
  evaluateCarrierProviderState,
  evaluatePaymentProviderState,
  evaluateReturnsProviderState,
} from "@/lib/production-access/providerRegistry";
import { resolveGenericSecretRef } from "@/lib/production-access/secretRefs";
import { hasProductionEvidence } from "@/lib/production-access/evidenceStore";
import { CARRIER_PROFILES } from "@/lib/trade-route-fulfillment/carrierSelection";
import { listAllProviderKinds, hasProviderSecretRef } from "@/lib/payment-production/config";
import type { ControlCenterStatus } from "@/lib/external-access-control-center/types";
import { resolveCredentialDisplayState } from "./credentialState";
import { hasExternalLiveEvidence } from "./externalProviderEvidenceStore";
import type { MasterProviderMatrixRow } from "./types";

function liveFromEvidence(category: string, providerId: string): ControlCenterStatus {
  if (
    hasExternalLiveEvidence(category, providerId, "authentication") ||
    hasExternalLiveEvidence(category, providerId, "health") ||
    hasProductionEvidence(providerId, "authentication")
  ) {
    return "VALIDATED";
  }
  return "UNVERIFIED_EXTERNAL";
}

export function buildPaymentMasterRows(): MasterProviderMatrixRow[] {
  const state = evaluatePaymentProviderState();
  const generic = resolveGenericSecretRef({
    providerId: "payment",
    secretRefEnvKey: "PAYMENT_PROVIDER_SECRET_REF",
    fallbackEnvKey: "PAYMENT_PROVIDER_SECRET",
  });
  const cred = resolveCredentialDisplayState({
    secretRefConfigured: generic.secretRefConfigured,
    secretResolvable: generic.secretResolvable,
    category: "PAYMENT",
    providerId: "payment",
    configuredFlag: state.credentialConfigured,
  });
  const live = liveFromEvidence("PAYMENT", "payment");
  return [
    {
      provider: "PAYMENT",
      category: "PAYMENT",
      required: true,
      configured: state.endpointConfigured ?? state.credentialConfigured,
      secretRef: generic.secretRefKey,
      credentialState: cred,
      networkState: isProductionFlagEnabled("PAYMENT_PRODUCTION") ? "FAILED" : "DISABLED",
      liveValidation: live,
      productionEvidence: live === "VALIDATED" ? "VALIDATED" : "NONE",
      humanApproval: true,
      blocking: live !== "VALIDATED",
      nextHumanAction: cred === "NOT_CONFIGURED" ? "Configure payment provider SecretRef + KYC/webhooks" : "Run read-only payment auth validation",
    },
  ];
}

export function buildCarrierMasterRows(): MasterProviderMatrixRow[] {
  const state = evaluateCarrierProviderState();
  const generic = resolveGenericSecretRef({
    providerId: "carrier",
    secretRefEnvKey: "CARRIER_PROVIDER_SECRET_REF",
    fallbackEnvKey: "CARRIER_PROVIDER_SECRET",
  });
  const cred = resolveCredentialDisplayState({
    secretRefConfigured: generic.secretRefConfigured,
    secretResolvable: generic.secretResolvable,
    category: "CARRIER",
    providerId: "carrier",
    configuredFlag: state.credentialConfigured,
  });
  const live = liveFromEvidence("CARRIER", "carrier");
  const rows: MasterProviderMatrixRow[] = [
    {
      provider: "CARRIER",
      category: "CARRIER",
      required: true,
      configured: state.endpointConfigured ?? false,
      secretRef: generic.secretRefKey,
      credentialState: cred,
      networkState: isProductionFlagEnabled("CARRIER_PRODUCTION") ? "FAILED" : "DISABLED",
      liveValidation: live,
      productionEvidence: live === "VALIDATED" ? "VALIDATED" : "NONE",
      humanApproval: true,
      blocking: live !== "VALIDATED",
      nextHumanAction: "Configure carrier account SecretRef; validate API read-only — no labels",
    },
  ];
  for (const profile of CARRIER_PROFILES) {
    rows.push({
      provider: profile.carrierId,
      category: "CARRIER",
      required: false,
      configured: true,
      secretRef: generic.secretRefKey,
      credentialState: cred,
      networkState: "DISABLED",
      liveValidation: "UNVERIFIED_EXTERNAL",
      productionEvidence: "NONE",
      humanApproval: true,
      blocking: true,
      nextHumanAction: `Carrier ${profile.carrierId}: credentials + live validation before labels`,
    });
  }
  return rows;
}

export function buildReturnsMasterRows(): MasterProviderMatrixRow[] {
  const state = evaluateReturnsProviderState();
  const generic = resolveGenericSecretRef({
    providerId: "returns",
    secretRefEnvKey: "RETURNS_PROVIDER_SECRET_REF",
    fallbackEnvKey: "RETURNS_PROVIDER_SECRET",
  });
  const cred = resolveCredentialDisplayState({
    secretRefConfigured: generic.secretRefConfigured,
    secretResolvable: generic.secretResolvable,
    category: "RETURNS",
    providerId: "returns",
    configuredFlag: state.credentialConfigured,
  });
  const live = liveFromEvidence("RETURNS", "returns");
  return [
    {
      provider: "RETURNS",
      category: "RETURNS",
      required: true,
      configured: state.endpointConfigured ?? false,
      secretRef: generic.secretRefKey,
      credentialState: cred,
      networkState: isProductionFlagEnabled("RETURNS_PRODUCTION") ? "FAILED" : "DISABLED",
      liveValidation: live,
      productionEvidence: live === "VALIDATED" ? "VALIDATED" : "NONE",
      humanApproval: true,
      blocking: live !== "VALIDATED",
      nextHumanAction: "Configure returns/refunds SecretRef; customer refund vs supplier credit remain separate",
    },
    {
      provider: "REFUNDS",
      category: "RETURNS",
      required: true,
      configured: state.endpointConfigured ?? false,
      secretRef: generic.secretRefKey,
      credentialState: cred,
      networkState: "DISABLED",
      liveValidation: "UNVERIFIED_EXTERNAL",
      productionEvidence: "NONE",
      humanApproval: true,
      blocking: true,
      nextHumanAction: "No automatic refunds — production evidence required per provider",
    },
  ];
}

export function scoreFromRows(rows: MasterProviderMatrixRow[]): ControlCenterStatus {
  if (rows.some((r) => r.provider === rows[0]?.provider && r.liveValidation === "VALIDATED")) return "VALIDATED";
  if (rows.every((r) => r.credentialState === "NOT_CONFIGURED")) return "NOT_CONFIGURED";
  if (rows.some((r) => r.credentialState === "REFERENCE_PRESENT")) return "HUMAN_REQUIRED";
  return "UNVERIFIED_EXTERNAL";
}

export function listConfiguredPaymentKinds(): string[] {
  return listAllProviderKinds().filter((k) => k !== "MOCK" && hasProviderSecretRef(k));
}
