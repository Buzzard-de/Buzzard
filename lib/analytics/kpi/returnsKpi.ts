import { getOrder } from "@/lib/order-engine";
import type { AnalyticsEvent } from "../types";
import { toCents } from "../revenue";
import type { ReturnKpis } from "./types";
import {
  computeCategoryKpis,
  computeCommerceChannelKpis,
  computeMarketKpis,
  computeProductKpis,
} from "./intelligence";
import { isAuthoritativePurchase, isAuthoritativeRefund, safeRate } from "./query";

export function computeReturnKpis(events: AnalyticsEvent[]): ReturnKpis {
  const purchases = events.filter(isAuthoritativePurchase);
  const uniqueOrders = new Set(purchases.map((p) => p.orderIdReference).filter(Boolean)).size;
  const returnRequests = events.filter((e) => e.eventType === "RETURN").length;
  const refunds = events.filter(isAuthoritativeRefund);
  const refundAmountCents = refunds.reduce((sum, e) => sum + toCents(e.value ?? 0), 0);
  const grossRevenueCents = purchases.reduce((sum, e) => sum + toCents(e.value ?? 0), 0);

  const products = computeProductKpis(events, 50);
  const categories = computeCategoryKpis(events, 50);
  const markets = computeMarketKpis(events);
  const channels = computeCommerceChannelKpis(events);

  return {
    returnRequests,
    returnedOrders: returnRequests,
    refundAmountCents,
    returnRate: safeRate(returnRequests, uniqueOrders),
    refundRate: safeRate(refunds.length, uniqueOrders),
    netRevenueAfterReturnsCents: grossRevenueCents - refundAmountCents,
    byProduct: products
      .filter((p) => p.purchases > 0)
      .map((p) => ({
        productId: p.productId,
        returnRate: p.returnRate,
        refundImpactCents: Math.max(0, p.revenueCents - p.netRevenueCents),
      })),
    byCategory: categories.map((c) => ({
      categoryId: c.categoryId,
      returnRate: c.returnRate,
    })),
    byMarket: markets
      .filter((m) => m.orders > 0)
      .map((m) => ({ market: m.market, returnRate: m.returnRate })),
    byChannel: channels
      .filter((c) => c.orders > 0)
      .map((c) => ({ channel: c.channel, refundRate: safeRate(c.returns, c.orders) })),
  };
}

export function enrichReturnFromOrder(orderId: string): {
  returnImpactCents: number;
  eligible: boolean;
} {
  const order = getOrder(orderId);
  if (!order) return { returnImpactCents: 0, eligible: false };
  return {
    returnImpactCents: toCents(order.returnRefund.buzzardRefundLoss + order.returnRefund.returnShippingCost),
    eligible: order.returnRefund.returnStatus !== "NONE",
  };
}
