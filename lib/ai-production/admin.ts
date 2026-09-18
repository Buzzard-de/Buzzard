import { deriveProviderLiveStatus } from "@/lib/production-access/providerLiveStatus";
import { resolveGenericSecretRef } from "@/lib/production-access/secretRefs";
import { AI_PRODUCTION_VERSION, AI_WORKERS, isAiProductionEnabled } from "./config";
import { resolveDefaultAuthority } from "./authority";
import { assertAiProductionSafetyInvariants, getAiProductionSafetyCounters } from "./safety";
import type { AiProductionDashboard } from "./types";

export function getAiProductionDashboard(): AiProductionDashboard {
  const safety = assertAiProductionSafetyInvariants();
  const secret = resolveGenericSecretRef({
    providerId: "ai",
    secretRefEnvKey: "AI_PROVIDER_SECRET_REF",
  });
  return {
    version: AI_PRODUCTION_VERSION,
    productionEnabled: isAiProductionEnabled() ? "ENABLED" : "DISABLED",
    liveStatus: deriveProviderLiveStatus({ secret, evidenceCapabilities: ["health"] }),
    defaultAuthority: resolveDefaultAuthority(),
    workers: AI_WORKERS,
    safetyCounters: getAiProductionSafetyCounters(),
    blockers: safety.violations,
  };
}
