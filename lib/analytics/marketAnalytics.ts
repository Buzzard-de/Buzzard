import { listMarkets } from "@/lib/market-engine/registry";
import type { AnalyticsEvent } from "./types";
import { listEvents } from "./registry";
import { computeRevenueMetrics } from "./revenue";

export interface MarketAnalyticsRow {
  market: string;
  country: string;
  language: string;
  currency: string;
  visitors: number;
  sessions: number;
  orders: number;
  revenueCents: number;
  conversionRate: number;
  averageOrderValueCents: number;
  returnRate: number;
}

export function computeMarketAnalytics(events: AnalyticsEvent[] = listEvents()): MarketAnalyticsRow[] {
  const markets = listMarkets().map((m) => m.countryCode);
  const rows: MarketAnalyticsRow[] = [];

  for (const market of markets) {
    const marketEvents = events.filter((e) => e.market === market);
    if (!marketEvents.length) continue;

    const visitors = new Set(marketEvents.map((e) => e.anonymousVisitorId)).size;
    const sessions = new Set(marketEvents.map((e) => e.sessionId)).size;
    const revenue = computeRevenueMetrics(marketEvents);
    const returns = marketEvents.filter((e) => e.eventType === "RETURN").length;
    const purchases = marketEvents.filter((e) => e.eventType === "PURCHASE" && e.revenueAuthority === "AUTHORITATIVE").length;

    rows.push({
      market,
      country: market,
      language: marketEvents[0]?.language ?? "de",
      currency: marketEvents[0]?.currency ?? "EUR",
      visitors,
      sessions,
      orders: revenue.orderCount,
      revenueCents: revenue.netRevenueCents,
      conversionRate: sessions ? Number(((purchases / sessions) * 100).toFixed(2)) : 0,
      averageOrderValueCents: revenue.averageOrderValueCents,
      returnRate: purchases ? Number(((returns / purchases) * 100).toFixed(2)) : 0,
    });
  }

  return rows.sort((a, b) => b.revenueCents - a.revenueCents);
}
