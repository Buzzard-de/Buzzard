import { getDefaultAiProviderId, isAiProductionEnabled, resolveAiSecretRef } from "./config";
import { assertAiProductionSafety } from "./safety";
import type { AiProductionProviderId } from "./types";

export function getAiProviderHealth(providerId: AiProductionProviderId = getDefaultAiProviderId()): {
  providerId: AiProductionProviderId;
  configured: boolean;
  environment: "SANDBOX" | "PRODUCTION";
  secretRef: string;
} {
  assertAiProductionSafety();
  return {
    providerId,
    configured: Boolean(resolveAiSecretRef(providerId)),
    environment: isAiProductionEnabled() ? "PRODUCTION" : "SANDBOX",
    secretRef: "[METADATA_ONLY]",
  };
}
