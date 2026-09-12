import type { DashboardOverview } from "./types";
import { listEvents, listVisitors } from "./registry";
import { countActiveSessions } from "./session";
import { computeFunnelMetrics } from "./funnel";
import { computeConversionMetrics } from "./conversion";
import { computeRevenueMetrics } from "./revenue";

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function countUniqueVisitorsBetween(events: ReturnType<typeof listEvents>, start: string, end: string): number {
  const ids = new Set<string>();
  for (const e of events) {
    const d = dayKey(e.timestamp);
    if (d >= start && d <= end) ids.add(e.anonymousVisitorId);
  }
  return ids.size;
}

export function computeDashboardOverview(now = new Date()): DashboardOverview {
  const events = listEvents();
  const today = dayKey(now.toISOString());
  const yesterday = dayKey(new Date(now.getTime() - 86400000).toISOString());
  const last7 = dayKey(new Date(now.getTime() - 6 * 86400000).toISOString());
  const last30 = dayKey(new Date(now.getTime() - 29 * 86400000).toISOString());

  const funnel = computeFunnelMetrics(events);
  const conversion = computeConversionMetrics();
  const revenue = computeRevenueMetrics(events);

  const visitors = listVisitors();
  const newVisitors = visitors.filter((v) => !v.isReturning).length;
  const returningVisitors = visitors.filter((v) => v.isReturning).length;

  const recentMinute = events.filter((e) => now.getTime() - Date.parse(e.timestamp) <= 60000).length;
  const todayEvents = events.filter((e) => dayKey(e.timestamp) === today);
  const todayPurchases = todayEvents.filter((e) => e.eventType === "PURCHASE" && e.revenueAuthority === "AUTHORITATIVE");
  const todayRevenueCents = todayPurchases.reduce((sum, e) => sum + Math.round((e.value ?? 0) * 100), 0);

  return {
    freshness: "NEAR_REAL_TIME",
    visitorsToday: countUniqueVisitorsBetween(events, today, today),
    visitorsYesterday: countUniqueVisitorsBetween(events, yesterday, yesterday),
    visitorsLast7Days: countUniqueVisitorsBetween(events, last7, today),
    visitorsLast30Days: countUniqueVisitorsBetween(events, last30, today),
    uniqueVisitors: funnel.visitors,
    sessions: funnel.sessions,
    newVisitors,
    returningVisitors,
    pageViews: events.filter((e) => e.eventType === "PAGE_VIEW").length,
    productViews: funnel.productViews,
    addToCart: funnel.addToCart,
    checkoutStarted: funnel.checkoutStart,
    purchases: funnel.purchases,
    conversionRate: conversion.purchaseConversion,
    averageOrderValueCents: revenue.averageOrderValueCents,
    grossRevenueCents: revenue.grossRevenueCents,
    refundsCents: revenue.refundAmountCents,
    netRevenueCents: revenue.netRevenueCents,
    activeSessions: countActiveSessions(now.toISOString()),
    activeVisitors: countActiveSessions(now.toISOString()),
    eventsPerMinute: recentMinute,
    ordersToday: todayPurchases.length,
    revenueTodayCents: todayRevenueCents,
  };
}
