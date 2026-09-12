import type { AnalyticsEvent, FunnelMetrics } from "./types";
import { listEvents, listSessions, listVisitors } from "./registry";

export function computeFunnelMetrics(events: AnalyticsEvent[] = listEvents()): FunnelMetrics {
  const visitors = listVisitors().length;
  const sessions = listSessions().length;

  const productViews = events.filter((e) => e.eventType === "PRODUCT_VIEW").length;
  const addToCart = events.filter((e) => e.eventType === "ADD_TO_CART").length;
  const checkoutStart = events.filter((e) => e.eventType === "CHECKOUT_START").length;
  const checkoutCompleted = events.filter((e) => e.eventType === "CHECKOUT_COMPLETED").length;
  const purchases = events.filter(
    (e) => e.eventType === "PURCHASE" && e.revenueAuthority === "AUTHORITATIVE"
  ).length;

  const rate = (num: number, den: number) => (den > 0 ? Number(((num / den) * 100).toFixed(2)) : 0);

  return {
    visitors,
    sessions,
    productViews,
    addToCart,
    checkoutStart,
    checkoutCompleted,
    purchases,
    productViewRate: rate(productViews, sessions),
    addToCartRate: rate(addToCart, productViews),
    checkoutStartRate: rate(checkoutStart, addToCart),
    checkoutCompletionRate: rate(checkoutCompleted, checkoutStart),
    purchaseConversionRate: rate(purchases, checkoutStart),
    overallConversionRate: rate(purchases, sessions),
  };
}
