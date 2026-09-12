import type { AnalyticsEvent } from "../types";
import { listVisitors } from "../registry";
import { toCents } from "../revenue";
import type { CohortKpiRow, CustomerKpis } from "./types";
import { isAuthoritativePurchase, safeRate } from "./query";

export function computeCustomerKpis(events: AnalyticsEvent[]): CustomerKpis {
  const visitorsInRange = new Set(events.map((e) => e.anonymousVisitorId));
  const allVisitors = listVisitors().filter((v) => visitorsInRange.has(v.anonymousVisitorId));
  const newVisitors = allVisitors.filter((v) => !v.isReturning).length;
  const returningVisitors = allVisitors.filter((v) => v.isReturning).length;
  const purchases = events.filter(isAuthoritativePurchase);
  const revenueCents = purchases.reduce((sum, e) => sum + toCents(e.value ?? 0), 0);
  const visitorCount = visitorsInRange.size || 1;

  return {
    newVisitors,
    returningVisitors,
    sessionsPerVisitor: Number((new Set(events.map((e) => e.sessionId)).size / visitorCount).toFixed(2)),
    purchasesPerVisitor: Number((purchases.length / visitorCount).toFixed(2)),
    revenuePerVisitorCents: Math.round(revenueCents / visitorCount),
  };
}

export function computeCohortKpis(events: AnalyticsEvent[]): CohortKpiRow[] {
  const byPeriod = new Map<string, CohortKpiRow & { purchaseVisitors: Set<string> }>();

  for (const event of events) {
    const period = event.timestamp.slice(0, 7);
    const row = byPeriod.get(period) ?? {
      cohortPeriod: period,
      firstTimeVisitors: 0,
      returningSessions: 0,
      repeatPurchases: 0,
      revenueCents: 0,
      purchaseVisitors: new Set<string>(),
    };

    if (event.eventType === "SESSION_START") {
      const visitor = listVisitors().find((v) => v.anonymousVisitorId === event.anonymousVisitorId);
      if (visitor?.isReturning) row.returningSessions += 1;
      else row.firstTimeVisitors += 1;
    }
    if (isAuthoritativePurchase(event)) {
      row.revenueCents += toCents(event.value ?? 0);
      if (row.purchaseVisitors.has(event.anonymousVisitorId)) {
        row.repeatPurchases += 1;
      }
      row.purchaseVisitors.add(event.anonymousVisitorId);
    }

    byPeriod.set(period, row);
  }

  return [...byPeriod.values()]
    .map(({ purchaseVisitors: _pv, ...row }) => row)
    .sort((a, b) => a.cohortPeriod.localeCompare(b.cohortPeriod));
}
