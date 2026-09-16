import { getGoLiveSafetyCounters } from "./safety";
import type { GoLiveCheckResult } from "./types";

export function validateCustomerImpact(): { check: GoLiveCheckResult; blockers: string[] } {
  const counters = getGoLiveSafetyCounters();
  const blockers: string[] = [];

  if (counters.realCustomerOrders !== 0) blockers.push("UNEXPECTED_CUSTOMER_ORDERS");
  if (counters.marketplaceSideEffects !== 0) blockers.push("UNEXPECTED_MARKETPLACE_EFFECTS");
  if (counters.paymentSideEffects !== 0) blockers.push("UNEXPECTED_PAYMENT_EFFECTS");
  if (counters.carrierSideEffects !== 0) blockers.push("UNEXPECTED_CARRIER_EFFECTS");
  if (counters.customerNotifications !== 0) blockers.push("UNEXPECTED_CUSTOMER_NOTIFICATIONS");

  return {
    check: {
      check: "CUSTOMER_IMPACT",
      category: "CUSTOMER",
      level: blockers.length === 0 ? "PASS" : "BLOCKED",
      message: blockers.length === 0 ? "No unexpected customer side effects" : blockers.join(","),
    },
    blockers,
  };
}
