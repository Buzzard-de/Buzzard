import { CARRIER_PRODUCTION_VERSION, isCarrierProductionEnabled } from "./config";
import { assertCarrierProductionSafetyInvariants, getCarrierProductionSafetyCounters } from "./safety";
import type { CarrierProductionDashboard } from "./types";

export function getCarrierProductionDashboard(): CarrierProductionDashboard {
  const safety = assertCarrierProductionSafetyInvariants();
  return {
    version: CARRIER_PRODUCTION_VERSION,
    productionEnabled: isCarrierProductionEnabled() ? "ENABLED" : "DISABLED",
    liveStatus: "NOT_CONFIGURED",
    safetyCounters: getCarrierProductionSafetyCounters(),
    blockers: safety.violations,
  };
}
