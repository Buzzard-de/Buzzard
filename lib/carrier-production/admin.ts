import { deriveProviderLiveStatus } from "@/lib/production-access/providerLiveStatus";
import { resolveGenericSecretRef } from "@/lib/production-access/secretRefs";
import { CARRIER_PRODUCTION_VERSION, isCarrierProductionEnabled } from "./config";
import { assertCarrierProductionSafetyInvariants, getCarrierProductionSafetyCounters } from "./safety";
import type { CarrierProductionDashboard } from "./types";

export function getCarrierProductionDashboard(): CarrierProductionDashboard {
  const safety = assertCarrierProductionSafetyInvariants();
  const secret = resolveGenericSecretRef({
    providerId: "carrier",
    secretRefEnvKey: "CARRIER_PROVIDER_SECRET_REF",
  });
  return {
    version: CARRIER_PRODUCTION_VERSION,
    productionEnabled: isCarrierProductionEnabled() ? "ENABLED" : "DISABLED",
    liveStatus: deriveProviderLiveStatus({ secret, evidenceCapabilities: ["health"] }),
    safetyCounters: getCarrierProductionSafetyCounters(),
    blockers: safety.violations,
  };
}
