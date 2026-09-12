import type { AnalyticsEvent, TrafficSourceType } from "./types";
import { listEvents } from "./registry";
import { computeRevenueMetrics } from "./revenue";
import { attributeOrderToChannel } from "./attribution";

export interface ChannelAnalyticsRow {
  channel: TrafficSourceType;
  visitors: number;
  sessions: number;
  orders: number;
  revenueCents: number;
  conversionRate: number;
  averageOrderValueCents: number;
}

const CHANNELS: TrafficSourceType[] = [
  "DIRECT",
  "ORGANIC_SEARCH",
  "PAID_SEARCH",
  "SOCIAL",
  "EMAIL",
  "REFERRAL",
  "MARKETPLACE",
  "OTHER",
];

export function computeChannelAnalytics(events: AnalyticsEvent[] = listEvents()): ChannelAnalyticsRow[] {
  return CHANNELS.map((channel) => {
    const channelEvents = events.filter((e) => {
      if (e.eventType === "PURCHASE" && e.revenueAuthority === "AUTHORITATIVE") {
        return attributeOrderToChannel(e, "sessionTouch") === channel;
      }
      return e.trafficSource === channel;
    });

    const visitors = new Set(channelEvents.map((e) => e.anonymousVisitorId)).size;
    const sessions = new Set(channelEvents.map((e) => e.sessionId)).size;
    const revenue = computeRevenueMetrics(channelEvents.filter((e) => e.trafficSource === channel || e.eventType === "PURCHASE"));
    const purchases = channelEvents.filter((e) => e.eventType === "PURCHASE" && e.revenueAuthority === "AUTHORITATIVE").length;

    return {
      channel,
      visitors,
      sessions,
      orders: revenue.orderCount,
      revenueCents: revenue.netRevenueCents,
      conversionRate: sessions ? Number(((purchases / sessions) * 100).toFixed(2)) : 0,
      averageOrderValueCents: revenue.averageOrderValueCents,
    };
  }).filter((row) => row.visitors > 0 || row.orders > 0);
}
