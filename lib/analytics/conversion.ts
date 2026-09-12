import type { ConversionMetrics } from "./types";
import { listSessions } from "./registry";
import { listEvents } from "./registry";

export function computeConversionMetrics(): ConversionMetrics {
  const eligibleSessions = listSessions().filter((s) => s.pageViews > 0).length;
  const events = listEvents();

  const sessionsWithCart = new Set(
    events.filter((e) => e.eventType === "ADD_TO_CART").map((e) => e.sessionId)
  ).size;
  const sessionsWithCheckout = new Set(
    events.filter((e) => e.eventType === "CHECKOUT_START").map((e) => e.sessionId)
  ).size;
  const sessionsWithPurchase = new Set(
    events.filter((e) => e.eventType === "PURCHASE" && e.revenueAuthority === "AUTHORITATIVE").map((e) => e.sessionId)
  ).size;

  const pct = (num: number, den: number) => (den > 0 ? Number(((num / den) * 100).toFixed(2)) : 0);

  return {
    eligibleSessions,
    addToCartConversion: pct(sessionsWithCart, eligibleSessions),
    checkoutConversion: pct(sessionsWithCheckout, sessionsWithCart),
    purchaseConversion: pct(sessionsWithPurchase, eligibleSessions),
  };
}
