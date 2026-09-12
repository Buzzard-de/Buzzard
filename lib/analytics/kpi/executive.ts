import type { AnalyticsEvent } from "../types";
import { toCents } from "../revenue";
import type { ExecutiveKpis } from "./types";
import {
  isAuthoritativePurchase,
  isAuthoritativeRefund,
  safeRate,
  uniqueOrderPurchases,
} from "./query";

export function computeExecutiveKpis(events: AnalyticsEvent[]): ExecutiveKpis {
  const purchases = uniqueOrderPurchases(events);
  const refunds = events.filter(isAuthoritativeRefund);
  const sessions = new Set(events.map((e) => e.sessionId)).size;
  const visitors = new Set(events.map((e) => e.anonymousVisitorId)).size;
  const productViews = events.filter((e) => e.eventType === "PRODUCT_VIEW").length;
  const addToCart = events.filter((e) => e.eventType === "ADD_TO_CART").length;
  const checkoutStarts = events.filter((e) => e.eventType === "CHECKOUT_START").length;
  const checkoutCompletions = events.filter((e) => e.eventType === "CHECKOUT_COMPLETED").length;
  const returnRequests = events.filter((e) => e.eventType === "RETURN").length;

  const grossRevenueCents = purchases.reduce((sum, e) => sum + toCents(e.value ?? 0), 0);
  const refundAmountCents = refunds.reduce((sum, e) => sum + toCents(e.value ?? 0), 0);
  const unitsSold = purchases.reduce((sum, e) => sum + (e.quantity ?? 1), 0);
  const orders = purchases.length;

  return {
    orders,
    grossRevenueCents,
    authoritativeRevenueCents: grossRevenueCents,
    averageOrderValueCents: orders ? Math.round(grossRevenueCents / orders) : 0,
    unitsSold,
    revenuePerSessionCents: sessions ? Math.round(grossRevenueCents / sessions) : 0,
    visitors,
    sessions,
    productViews,
    addToCart,
    checkoutStarts,
    checkoutCompletions,
    purchases: orders,
    conversionRate: safeRate(orders, sessions),
    addToCartRate: safeRate(addToCart, productViews),
    checkoutCompletionRate: safeRate(checkoutCompletions, checkoutStarts),
    returnRequests,
    returnedOrders: returnRequests,
    refundAmountCents,
    returnRate: safeRate(returnRequests, orders),
    refundRate: safeRate(refunds.length, orders),
    netRevenueCents: grossRevenueCents - refundAmountCents,
  };
}
