import { hasProductionEvidence } from "@/lib/production-access/evidenceStore";
import { hasExternalLiveEvidence } from "./externalProviderEvidenceStore";
import type { CredentialDisplayState } from "./types";

export function resolveCredentialDisplayState(input: {
  secretRefConfigured: boolean;
  secretResolvable: boolean;
  category: string;
  providerId: string;
  capability?: string;
  configuredFlag?: boolean;
  invalid?: boolean;
  expired?: boolean;
}): CredentialDisplayState {
  if (input.expired) return "EXPIRED";
  if (input.invalid) return "INVALID";
  if (!input.secretRefConfigured && !input.secretResolvable && !input.configuredFlag) {
    return "NOT_CONFIGURED";
  }
  if (input.secretRefConfigured && !input.secretResolvable && !input.configuredFlag) {
    return "REFERENCE_PRESENT";
  }
  const cap = input.capability ?? "authentication";
  const live =
    hasExternalLiveEvidence(input.category, input.providerId, cap) ||
    hasProductionEvidence(input.providerId, cap);
  if (live) return "VALIDATED";
  if (input.secretResolvable || input.configuredFlag) return "CONFIGURED";
  if (input.secretRefConfigured) return "REFERENCE_PRESENT";
  return "UNVERIFIED";
}
