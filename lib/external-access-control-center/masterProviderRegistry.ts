import { buildExternalAccessMatrix } from "@/lib/final-external-access/externalAccessMatrix";
import { hasProductionEvidence } from "@/lib/production-access/evidenceStore";
import { isProductionFlagEnabled } from "@/lib/production-defaults";
import type { ExternalAccessEntry } from "@/lib/final-external-access/types";
import { mapExternalEntryStatus, liveValidationFromEntry } from "./statusModel";
import type { ExternalAccessMatrixRow, ProviderRegistryEntry } from "./types";

function categoryFor(provider: string): string {
  if (provider.includes("CARRIER/")) return "CARRIER";
  if (provider.startsWith("PAYMENT/")) return "PAYMENT";
  if (["AMAZON", "EBAY", "KAUFLAND", "ALLEGRO", "BOL", "CDISCOUNT", "OTTO", "EMAG", "SKROUTZ"].includes(provider)) {
    return "MARKETPLACE";
  }
  if (provider === "INTER CARS") return "SUPPLIER";
  if (provider === "PERSISTENT STORAGE" || provider === "DEPLOYMENT") return "RENDER";
  if (provider === "MARKETING") return "MARKETING";
  if (provider === "AI PROVIDER") return "AI";
  if (provider === "RETURNS" || provider === "REFUNDS") return "RETURNS";
  return "PLATFORM";
}

function providerIdSlug(provider: string): string {
  return provider.toLowerCase().replace(/\s+/g, "-").replace(/\//g, "-");
}

function riskLevel(entry: ExternalAccessEntry): ProviderRegistryEntry["riskLevel"] {
  if (entry.provider === "INTER CARS" || entry.provider === "PAYMENT") return "CRITICAL";
  if (entry.provider.startsWith("CARRIER/") || entry.provider === "PERSISTENT STORAGE") return "HIGH";
  return "MEDIUM";
}

export function buildProviderRegistry(): ProviderRegistryEntry[] {
  const matrix = buildExternalAccessMatrix();
  return matrix.map((entry) => {
    const slug = providerIdSlug(entry.provider);
    const evidence = hasProductionEvidence(slug.split("-")[0] ?? slug, "health") || entry.capabilityValidated;
    return {
      providerId: slug,
      name: entry.provider,
      category: categoryFor(entry.provider),
      environment: entry.environment,
      required: entry.provider !== "EMAIL" && entry.provider !== "FINANCIAL PROVIDER",
      secretRefs: entry.credentialSecretRef ? [entry.credentialSecretRef] : [],
      credentialState: entry.credentialConfigured ? "CONFIGURED" : "NOT_CONFIGURED",
      configurationState: entry.endpointConfigured ? "CONFIGURED" : "NOT_CONFIGURED",
      networkState: entry.liveNetworkEnabled ? "VALIDATED" : "DISABLED",
      liveValidationState: liveValidationFromEntry(entry, evidence),
      evidenceState: evidence ? "VALIDATED" : "UNVERIFIED_EXTERNAL",
      humanActionRequired: entry.requiredHumanApproval || entry.status === "BLOCKED",
      productionEnabled: entry.liveNetworkEnabled,
      riskLevel: riskLevel(entry),
      dependencies: entry.provider === "TRACKING" ? ["carrier"] : [],
      lastValidation: entry.lastValidationTimestamp,
      blockers: entry.blockingReason ? [entry.blockingReason] : [],
      warnings: entry.status === "CONFIGURED" && !entry.capabilityValidated ? ["CONFIGURED_NOT_VALIDATED"] : [],
    };
  });
}

export function buildAccessMatrixRows(): ExternalAccessMatrixRow[] {
  const matrix = buildExternalAccessMatrix();
  return matrix.map((entry) => {
    const slug = providerIdSlug(entry.provider);
    const hasEv = hasProductionEvidence(slug.split("-")[0] ?? slug, "health");
    return {
      provider: entry.provider,
      required: entry.provider !== "EMAIL",
      configured: entry.endpointConfigured || entry.credentialConfigured,
      credentialsPresent: entry.credentialConfigured,
      secretReferencePresent: Boolean(entry.credentialSecretRef && entry.credentialSecretRef !== "n/a"),
      networkEnabled: entry.liveNetworkEnabled,
      liveValidation: liveValidationFromEntry(entry, hasEv || entry.capabilityValidated),
      productionEvidence: hasEv ? "VALIDATED" : entry.capabilityValidated ? "PARTIAL" : "NONE",
      humanApproval: entry.requiredHumanApproval,
      blocked: entry.status === "BLOCKED" || entry.status === "NOT_CONFIGURED",
      nextHumanAction: entry.blockingReason || (entry.requiredHumanApproval ? "HUMAN_APPROVAL_REQUIRED" : "NONE"),
    };
  });
}
