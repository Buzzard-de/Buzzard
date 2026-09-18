import { deriveProviderLiveStatus } from "@/lib/production-access/providerLiveStatus";
import { resolveGenericSecretRef } from "@/lib/production-access/secretRefs";
import { RETURNS_REFUNDS_PRODUCTION_VERSION, isReturnsProductionEnabled } from "./config";
import { assertReturnsRefundsSafetyInvariants, getReturnsRefundsSafetyCounters } from "./safety";
import type { ReturnsRefundsProductionDashboard } from "./types";

export function getReturnsRefundsProductionDashboard(): ReturnsRefundsProductionDashboard {
  const safety = assertReturnsRefundsSafetyInvariants();
  const secret = resolveGenericSecretRef({
    providerId: "returns",
    secretRefEnvKey: "RETURNS_PROVIDER_SECRET_REF",
  });
  return {
    version: RETURNS_REFUNDS_PRODUCTION_VERSION,
    productionEnabled: isReturnsProductionEnabled() ? "ENABLED" : "DISABLED",
    liveStatus: deriveProviderLiveStatus({ secret, evidenceCapabilities: ["refund"] }),
    safetyCounters: getReturnsRefundsSafetyCounters(),
    blockers: safety.violations,
  };
}
