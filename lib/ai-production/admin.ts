import { AI_PRODUCTION_VERSION, AI_WORKERS, isAiProductionEnabled } from "./config";
import { resolveDefaultAuthority } from "./authority";
import { assertAiProductionSafetyInvariants, getAiProductionSafetyCounters } from "./safety";
import type { AiProductionDashboard } from "./types";

export function getAiProductionDashboard(): AiProductionDashboard {
  const safety = assertAiProductionSafetyInvariants();
  return {
    version: AI_PRODUCTION_VERSION,
    productionEnabled: isAiProductionEnabled() ? "ENABLED" : "DISABLED",
    liveStatus: "NOT_CONFIGURED",
    defaultAuthority: resolveDefaultAuthority(),
    workers: AI_WORKERS,
    safetyCounters: getAiProductionSafetyCounters(),
    blockers: safety.violations,
  };
}
