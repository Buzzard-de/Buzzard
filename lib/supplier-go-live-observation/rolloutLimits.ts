import { resolveBroaderRolloutLimits } from "./config";
import type { RolloutLimits } from "./types";

export function validateRolloutLimits(limits: RolloutLimits): { valid: boolean; blockers: string[] } {
  const controlled = resolveBroaderRolloutLimits();
  const blockers: string[] = [];

  if (limits.maximumOrderValue > controlled.maximumOrderValue) {
    blockers.push("LIMIT_EXCEEDS_CONTROLLED_GO_LIVE:MAX_ORDER_VALUE");
  }
  if (limits.maximumDailyOrders > controlled.maximumDailyOrders) {
    blockers.push("LIMIT_EXCEEDS_CONTROLLED_GO_LIVE:MAX_DAILY_ORDERS");
  }
  if (limits.maximumDailyValue > controlled.maximumDailyValue) {
    blockers.push("LIMIT_EXCEEDS_CONTROLLED_GO_LIVE:MAX_DAILY_VALUE");
  }

  return { valid: blockers.length === 0, blockers };
}

export { resolveBroaderRolloutLimits };
