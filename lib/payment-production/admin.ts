import { PAYMENT_PRODUCTION_VERSION, getDefaultPaymentProviderId, isPaymentProductionEnabled } from "./config";
import { assertPaymentProductionSafetyInvariants, getPaymentProductionSafetyCounters } from "./safety";
import type { PaymentProductionDashboard } from "./types";

export function getPaymentProductionDashboard(): PaymentProductionDashboard {
  const safety = assertPaymentProductionSafetyInvariants();
  return {
    version: PAYMENT_PRODUCTION_VERSION,
    productionEnabled: isPaymentProductionEnabled() ? "ENABLED" : "DISABLED",
    liveStatus: "NOT_CONFIGURED",
    defaultProvider: getDefaultPaymentProviderId(),
    safetyCounters: getPaymentProductionSafetyCounters(),
    blockers: isPaymentProductionEnabled() ? ["PAYMENT_PRODUCTION_MUST_BE_DISABLED_IN_PREP"] : safety.violations,
  };
}
