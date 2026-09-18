import { getAllProviderStates } from "@/lib/production-access/providerRegistry";
import { hasProductionEvidence } from "@/lib/production-access/evidenceStore";
import { detectCredentialMetadata } from "./credentialDetection";
import type { OpsSectionStatus } from "./types";

function providerStatus(providerId: string, capability = "health"): OpsSectionStatus {
  const creds = detectCredentialMetadata();
  const cred = creds.find((c) => c.providerId === providerId);
  if (!cred || cred.status === "MISSING") return "NOT_CONFIGURED";
  if (cred.status === "INVALID") return "BLOCKED";
  if (cred.status === "VALIDATED" || hasProductionEvidence(providerId, capability)) return "PASS";
  return "UNVERIFIED";
}

export function evaluateProviderOperations(): {
  payment: OpsSectionStatus;
  carrier: OpsSectionStatus;
  ai: OpsSectionStatus;
  returns: OpsSectionStatus;
  marketing: OpsSectionStatus;
} {
  const states = getAllProviderStates();
  const marketingCred = detectCredentialMetadata().filter((c) =>
    ["google-ads", "meta"].includes(c.providerId),
  );
  const marketingConfigured = marketingCred.some((c) => c.status !== "MISSING");

  return {
    payment: providerStatus("payment", "authentication"),
    carrier: providerStatus("carrier", "health"),
    ai: providerStatus("ai", "health"),
    returns: states.find((s) => s.providerId === "returns")?.liveValidation === "VALIDATED"
      ? "PASS"
      : providerStatus("returns", "refund"),
    marketing: marketingConfigured
      ? hasProductionEvidence("marketing", "google-ads")
        ? "PASS"
        : "UNVERIFIED"
      : "NOT_CONFIGURED",
  };
}
