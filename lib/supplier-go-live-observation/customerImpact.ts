import { getObservationSafetyCounters } from "./safety";
import type { CheckLevel } from "./types";

export function evaluateCustomerImpact(): { level: CheckLevel; blockers: string[]; message: string } {
  const counters = getObservationSafetyCounters();
  const blockers: string[] = [];
  if (counters.customerNotifications > 0) blockers.push("UNEXPECTED_CUSTOMER_NOTIFICATIONS");
  if (counters.realCustomerOrders > 0) blockers.push("UNEXPECTED_REAL_CUSTOMER_ORDERS");
  if (counters.marketplaceSideEffects > 0) blockers.push("UNEXPECTED_MARKETPLACE_EFFECTS");
  if (counters.paymentSideEffects > 0) blockers.push("UNEXPECTED_PAYMENT_EFFECTS");
  if (blockers.length > 0) {
    return { level: "FAIL", blockers, message: blockers.join(",") };
  }
  return { level: "NOT_AVAILABLE", blockers: [], message: "NO_CUSTOMER_IMPACT_DATA" };
}
