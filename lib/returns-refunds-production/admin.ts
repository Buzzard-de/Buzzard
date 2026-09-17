import { RETURNS_REFUNDS_PRODUCTION_VERSION, isReturnsProductionEnabled } from "./config";
import { assertReturnsRefundsSafetyInvariants, getReturnsRefundsSafetyCounters } from "./safety";
import type { ReturnsRefundsProductionDashboard } from "./types";

export function getReturnsRefundsProductionDashboard(): ReturnsRefundsProductionDashboard {
  const safety = assertReturnsRefundsSafetyInvariants();
  return {
    version: RETURNS_REFUNDS_PRODUCTION_VERSION,
    productionEnabled: isReturnsProductionEnabled() ? "ENABLED" : "DISABLED",
    liveStatus: "NOT_CONFIGURED",
    safetyCounters: getReturnsRefundsSafetyCounters(),
    blockers: safety.violations,
  };
}
