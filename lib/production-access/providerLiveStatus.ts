import { hasProductionEvidence } from "./evidenceStore";
import type { SecretRefStatus } from "./types";

export type ProviderLiveStatus = "NOT_CONFIGURED" | "UNVERIFIED" | "VALIDATED";

/**
 * Derive admin liveStatus from secretRef resolution + production evidence.
 * Never fabricates VALIDATED without recorded evidence.
 */
export function deriveProviderLiveStatus(input: {
  secret: SecretRefStatus;
  evidenceCapabilities: string[];
}): ProviderLiveStatus {
  if (!input.secret.secretRefConfigured && !input.secret.secretResolvable) {
    return "NOT_CONFIGURED";
  }
  const validated = input.evidenceCapabilities.some((cap) =>
    hasProductionEvidence(input.secret.providerId, cap),
  );
  if (validated) return "VALIDATED";
  if (input.secret.secretResolvable || input.secret.secretRefConfigured) return "UNVERIFIED";
  return "NOT_CONFIGURED";
}
