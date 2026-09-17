import { randomUUID } from "crypto";
import { isProductionFlagEnabled } from "@/lib/production-defaults";
import { evaluateInterCarsProductionAccess } from "@/lib/supplier-inter-cars-production-access/diagnostic";
import { resolvePredefinedLiveProfile } from "@/lib/supplier-engine/liveSupplier/config";
import { getPaymentProductionDashboard } from "@/lib/payment-production/admin";
import { getCarrierProductionDashboard } from "@/lib/carrier-production/admin";
import { getAiProductionDashboard } from "@/lib/ai-production/admin";
import { getReturnsRefundsProductionDashboard } from "@/lib/returns-refunds-production/admin";
import { getTrackingFulfillmentDashboard } from "@/lib/tracking-fulfillment/admin";
import { hasProductionEvidence, listProviderAccessEvidence } from "./evidenceStore";
import { resolveGenericSecretRef, resolveInterCarsSecretRef } from "./secretRefs";
import type { AccessStatus, ProviderAccessState } from "./types";

export const PROVIDER_IDS = ["inter-cars", "payment", "carrier", "ai", "returns", "marketing"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

function mapCredentialStatus(status: string): AccessStatus {
  switch (status) {
    case "VALID":
    case "CONFIGURED":
      return "CONFIGURED";
    case "VALIDATED":
      return "VALIDATED";
    case "BLOCKED":
      return "BLOCKED";
    case "EXPIRED":
      return "EXPIRED";
    case "NOT_AVAILABLE":
      return "NOT_AVAILABLE";
    default:
      return "NOT_CONFIGURED";
  }
}

function resolveAccessState(input: {
  credentialConfigured: boolean;
  secretRefConfigured: boolean;
  liveValidation: AccessStatus;
  blocked?: boolean;
}): AccessStatus {
  if (input.blocked) return "BLOCKED";
  if (!input.credentialConfigured && !input.secretRefConfigured) return "NOT_CONFIGURED";
  if (input.liveValidation === "VALIDATED") return "VALIDATED";
  if (input.liveValidation === "VALIDATING") return "VALIDATING";
  if (input.liveValidation === "FAILED") return "FAILED";
  if (input.liveValidation === "REVOKED") return "REVOKED";
  if (input.liveValidation === "EXPIRED") return "EXPIRED";
  if (input.credentialConfigured || input.secretRefConfigured) return "CONFIGURED";
  return "UNVERIFIED";
}

export function evaluateInterCarsProviderState(): ProviderAccessState {
  const secret = resolveInterCarsSecretRef();
  const diag = evaluateInterCarsProductionAccess();
  const profile = resolvePredefinedLiveProfile();
  const evidence = listProviderAccessEvidence("inter-cars");
  const latest = evidence[evidence.length - 1];
  const readValidated = diag.readOnlyLiveValidation === "VALIDATED" || hasProductionEvidence("inter-cars", "health");
  const createValidated = diag.createOrderCapability === "VALIDATED";

  const liveValidation: AccessStatus = createValidated
    ? "VALIDATED"
    : readValidated
      ? "CONFIGURED"
      : secret.credentialStatus === "BLOCKED"
        ? "BLOCKED"
        : "UNVERIFIED";

  const blockers: string[] = [];
  if (!profile) blockers.push("MISSING_INTER_CARS_PROFILE");
  if (secret.credentialStatus === "NOT_CONFIGURED") blockers.push("MISSING_INTER_CARS_CREDENTIAL");
  if (createValidated === false) blockers.push("CREATE_ORDER_NOT_VALIDATED");

  return {
    providerId: "inter-cars",
    domain: "SUPPLIER",
    accessState: resolveAccessState({
      credentialConfigured: secret.secretResolvable,
      secretRefConfigured: secret.secretRefConfigured,
      liveValidation,
      blocked: secret.credentialStatus === "BLOCKED",
    }),
    credentialConfigured: secret.secretResolvable,
    secretRefConfigured: secret.secretRefConfigured,
    endpointConfigured: Boolean(profile?.baseUrl),
    networkPermission: process.env.SUPPLIER_LIVE_READ_ENABLED === "1",
    healthCheck: readValidated ? "VALIDATED" : "UNVERIFIED",
    authenticationCheck: secret.secretResolvable ? "CONFIGURED" : "NOT_CONFIGURED",
    capabilityCheck: createValidated ? "VALIDATED" : "UNVERIFIED",
    liveValidation,
    evidenceCount: evidence.length,
    lastValidationAt: latest?.timestamp,
    correlationId: diag.correlationId,
    productionEnabled: isProductionFlagEnabled("SUPPLIER_ORDER_NETWORK") ? "ON" : "OFF",
    blockers,
  };
}

export function evaluatePaymentProviderState(): ProviderAccessState {
  const secret = resolveGenericSecretRef({
    providerId: "payment",
    secretRefEnvKey: "PAYMENT_PROVIDER_SECRET_REF",
    fallbackEnvKey: "PAYMENT_PROVIDER_SECRET",
  });
  const dash = getPaymentProductionDashboard();
  const evidence = listProviderAccessEvidence("payment");
  const validated = hasProductionEvidence("payment", "authentication");

  return {
    providerId: "payment",
    domain: "PAYMENT",
    accessState: resolveAccessState({
      credentialConfigured: secret.secretResolvable,
      secretRefConfigured: secret.secretRefConfigured,
      liveValidation: validated ? "VALIDATED" : "UNVERIFIED",
    }),
    credentialConfigured: secret.secretResolvable,
    secretRefConfigured: secret.secretRefConfigured,
    endpointConfigured: Boolean(process.env.PAYMENT_PROVIDER_ENDPOINT),
    networkPermission: false,
    healthCheck: validated ? "VALIDATED" : "UNVERIFIED",
    authenticationCheck: secret.secretResolvable ? "CONFIGURED" : "NOT_CONFIGURED",
    capabilityCheck: "UNVERIFIED",
    liveValidation: validated ? "VALIDATED" : "UNVERIFIED",
    evidenceCount: evidence.length,
    lastValidationAt: evidence[evidence.length - 1]?.timestamp,
    correlationId: randomUUID(),
    productionEnabled: dash.productionEnabled === "ENABLED" ? "ON" : "OFF",
    blockers: validated ? [] : ["PAYMENT_NOT_VALIDATED"],
  };
}

export function evaluateCarrierProviderState(): ProviderAccessState {
  const secret = resolveGenericSecretRef({
    providerId: "carrier",
    secretRefEnvKey: "CARRIER_PROVIDER_SECRET_REF",
  });
  const dash = getCarrierProductionDashboard();
  const evidence = listProviderAccessEvidence("carrier");
  const validated = hasProductionEvidence("carrier", "health");

  return {
    providerId: "carrier",
    domain: "CARRIER",
    accessState: resolveAccessState({
      credentialConfigured: secret.secretResolvable,
      secretRefConfigured: secret.secretRefConfigured,
      liveValidation: validated ? "VALIDATED" : "UNVERIFIED",
    }),
    credentialConfigured: secret.secretResolvable,
    secretRefConfigured: secret.secretRefConfigured,
    endpointConfigured: Boolean(process.env.CARRIER_PROVIDER_ENDPOINT),
    networkPermission: false,
    healthCheck: validated ? "VALIDATED" : "UNVERIFIED",
    authenticationCheck: secret.secretResolvable ? "CONFIGURED" : "NOT_CONFIGURED",
    capabilityCheck: "UNVERIFIED",
    liveValidation: validated ? "VALIDATED" : "UNVERIFIED",
    evidenceCount: evidence.length,
    lastValidationAt: evidence[evidence.length - 1]?.timestamp,
    correlationId: randomUUID(),
    productionEnabled: dash.productionEnabled === "ENABLED" ? "ON" : "OFF",
    blockers: validated ? [] : ["CARRIER_NOT_VALIDATED"],
  };
}

export function evaluateAiProviderState(): ProviderAccessState {
  const secret = resolveGenericSecretRef({
    providerId: "ai",
    secretRefEnvKey: "AI_PROVIDER_SECRET_REF",
  });
  const dash = getAiProductionDashboard();
  const evidence = listProviderAccessEvidence("ai");
  const validated = hasProductionEvidence("ai", "health");

  return {
    providerId: "ai",
    domain: "AI",
    accessState: resolveAccessState({
      credentialConfigured: secret.secretResolvable,
      secretRefConfigured: secret.secretRefConfigured,
      liveValidation: validated ? "VALIDATED" : "UNVERIFIED",
    }),
    credentialConfigured: secret.secretResolvable,
    secretRefConfigured: secret.secretRefConfigured,
    endpointConfigured: Boolean(process.env.AI_PROVIDER_ENDPOINT),
    networkPermission: false,
    healthCheck: validated ? "VALIDATED" : "UNVERIFIED",
    authenticationCheck: secret.secretResolvable ? "CONFIGURED" : "NOT_CONFIGURED",
    capabilityCheck: "UNVERIFIED",
    liveValidation: validated ? "VALIDATED" : "UNVERIFIED",
    evidenceCount: evidence.length,
    lastValidationAt: evidence[evidence.length - 1]?.timestamp,
    correlationId: randomUUID(),
    productionEnabled: dash.productionEnabled === "ENABLED" ? "ON" : "OFF",
    blockers: validated ? [] : ["AI_NOT_VALIDATED"],
  };
}

export function evaluateReturnsProviderState(): ProviderAccessState {
  const dash = getReturnsRefundsProductionDashboard();
  const evidence = listProviderAccessEvidence("returns");
  const validated = hasProductionEvidence("returns", "refund");

  return {
    providerId: "returns",
    domain: "RETURNS",
    accessState: validated ? "VALIDATED" : "UNVERIFIED",
    credentialConfigured: false,
    secretRefConfigured: false,
    endpointConfigured: false,
    networkPermission: false,
    healthCheck: "UNVERIFIED",
    authenticationCheck: "NOT_CONFIGURED",
    capabilityCheck: "UNVERIFIED",
    liveValidation: validated ? "VALIDATED" : "UNVERIFIED",
    evidenceCount: evidence.length,
    lastValidationAt: evidence[evidence.length - 1]?.timestamp,
    correlationId: randomUUID(),
    productionEnabled: dash.productionEnabled === "ENABLED" ? "ON" : "OFF",
    blockers: validated ? [] : ["RETURNS_NOT_VALIDATED"],
  };
}

export function evaluateMarketingProviderState(): ProviderAccessState {
  const providers = ["GOOGLE_ADS", "META", "TIKTOK", "YOUTUBE"] as const;
  const configured = providers.some((p) => Boolean(process.env[`${p}_SECRET_REF`]?.trim()));
  const evidence = listProviderAccessEvidence("marketing");

  return {
    providerId: "marketing",
    domain: "MARKETING",
    accessState: configured ? "CONFIGURED" : "NOT_CONFIGURED",
    credentialConfigured: configured,
    secretRefConfigured: configured,
    endpointConfigured: false,
    networkPermission: false,
    healthCheck: "UNVERIFIED",
    authenticationCheck: configured ? "CONFIGURED" : "NOT_CONFIGURED",
    capabilityCheck: "UNVERIFIED",
    liveValidation: "UNVERIFIED",
    evidenceCount: evidence.length,
    correlationId: randomUUID(),
    productionEnabled: isProductionFlagEnabled("MARKETING_SPEND") ? "ON" : "OFF",
    blockers: configured ? ["MARKETING_NOT_VALIDATED"] : ["MARKETING_NOT_CONFIGURED"],
  };
}

export function evaluateTrackingState(): { liveValidation: AccessStatus; blockers: string[] } {
  const dash = getTrackingFulfillmentDashboard();
  const validated = hasProductionEvidence("inter-cars", "tracking");
  return {
    liveValidation: validated ? "VALIDATED" : "UNVERIFIED",
    blockers: validated ? [] : ["TRACKING_NOT_VALIDATED"],
  };
}

export function getAllProviderStates(): ProviderAccessState[] {
  return [
    evaluateInterCarsProviderState(),
    evaluatePaymentProviderState(),
    evaluateCarrierProviderState(),
    evaluateAiProviderState(),
    evaluateReturnsProviderState(),
    evaluateMarketingProviderState(),
  ];
}
