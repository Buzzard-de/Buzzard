import type { AdminAnalyticsContext } from "./types";
import { validateAdminAccess } from "./security";
import { recordAnalyticsAudit } from "./audit";
import { computeDashboardOverview } from "./metrics";
import { computeFunnelMetrics } from "./funnel";
import { computeProductAnalytics } from "./productAnalytics";
import { computeMarketAnalytics } from "./marketAnalytics";
import { computeChannelAnalytics } from "./channelAnalytics";
import { computeRevenueMetrics } from "./revenue";
import { listEvents } from "./registry";

function requireAdmin(context: AdminAnalyticsContext): { ok: true } | { ok: false; errorCode: string } {
  const check = validateAdminAccess(context);
  if (!check.ok) return { ok: false, errorCode: check.errorCode ?? "ADMIN_UNAUTHORIZED" };
  recordAnalyticsAudit({
    action: "DASHBOARD_ACCESS",
    actor: context.actorId ?? "ADMIN",
  });
  return { ok: true };
}

export function getOverview(context: AdminAnalyticsContext) {
  const auth = requireAdmin(context);
  if (!auth.ok) return auth;
  return { ok: true as const, data: computeDashboardOverview() };
}

export function getTraffic(context: AdminAnalyticsContext) {
  const auth = requireAdmin(context);
  if (!auth.ok) return auth;
  const events = listEvents();
  return {
    ok: true as const,
    data: {
      pageViews: events.filter((e) => e.eventType === "PAGE_VIEW").length,
      sessions: new Set(events.map((e) => e.sessionId)).size,
      visitors: new Set(events.map((e) => e.anonymousVisitorId)).size,
    },
  };
}

export function getFunnel(context: AdminAnalyticsContext) {
  const auth = requireAdmin(context);
  if (!auth.ok) return auth;
  return { ok: true as const, data: computeFunnelMetrics() };
}

export function getProducts(context: AdminAnalyticsContext) {
  const auth = requireAdmin(context);
  if (!auth.ok) return auth;
  return { ok: true as const, data: computeProductAnalytics() };
}

export function getMarkets(context: AdminAnalyticsContext) {
  const auth = requireAdmin(context);
  if (!auth.ok) return auth;
  return { ok: true as const, data: computeMarketAnalytics() };
}

export function getChannels(context: AdminAnalyticsContext) {
  const auth = requireAdmin(context);
  if (!auth.ok) return auth;
  return { ok: true as const, data: computeChannelAnalytics() };
}

export function getCampaigns(context: AdminAnalyticsContext) {
  const auth = requireAdmin(context);
  if (!auth.ok) return auth;
  const campaigns = new Map<string, number>();
  for (const event of listEvents()) {
    const key = event.trafficCampaign ?? "none";
    campaigns.set(key, (campaigns.get(key) ?? 0) + 1);
  }
  return { ok: true as const, data: [...campaigns.entries()].map(([campaign, events]) => ({ campaign, events })) };
}

export function getRevenue(context: AdminAnalyticsContext) {
  const auth = requireAdmin(context);
  if (!auth.ok) return auth;
  return { ok: true as const, data: computeRevenueMetrics() };
}

export function getReturns(context: AdminAnalyticsContext) {
  const auth = requireAdmin(context);
  if (!auth.ok) return auth;
  const events = listEvents();
  const returns = events.filter((e) => e.eventType === "RETURN").length;
  const refunds = events.filter((e) => e.eventType === "REFUND" && e.revenueAuthority === "AUTHORITATIVE");
  const refundAmountCents = refunds.reduce((sum, e) => sum + Math.round((e.value ?? 0) * 100), 0);
  const purchases = events.filter((e) => e.eventType === "PURCHASE" && e.revenueAuthority === "AUTHORITATIVE").length;
  return {
    ok: true as const,
    data: {
      returnCount: returns,
      refundCount: refunds.length,
      refundAmountCents,
      returnRate: purchases ? Number(((returns / purchases) * 100).toFixed(2)) : 0,
      refundRate: purchases ? Number(((refunds.length / purchases) * 100).toFixed(2)) : 0,
    },
  };
}

export function getMarketplace(context: AdminAnalyticsContext) {
  const auth = requireAdmin(context);
  if (!auth.ok) return auth;
  const events = listEvents().filter((e) => e.eventType === "MARKETPLACE_ORDER" || e.eventType === "MARKETPLACE_RETURN");
  return { ok: true as const, data: events };
}

export { getBusinessKpiDashboard, getBusinessKpiSection } from "./kpi/dashboard";
