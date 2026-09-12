import type { AnalyticsEvent } from "../types";
import { listEvents, listEventsInRange } from "../registry";
import type { KpiDateRangePreset, KpiQueryInput, ResolvedDateRange } from "./types";

export type { KpiQueryInput, KpiDateRangePreset, ResolvedDateRange };

export type KpiSection =
  | "executive"
  | "funnel"
  | "products"
  | "categories"
  | "markets"
  | "channels"
  | "traffic"
  | "returns"
  | "profitability";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 25;

export function clampLimit(limit?: number): number {
  if (!limit || limit < 1) return DEFAULT_LIMIT;
  return Math.min(Math.floor(limit), MAX_LIMIT);
}

export function safeRate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Number(((numerator / denominator) * 100).toFixed(2));
}

export function safeDelta(current: number, previous: number): {
  absolute: number;
  percent: number | null;
  points: number | null;
} {
  const absolute = Number((current - previous).toFixed(2));
  const percent = previous !== 0 ? Number(((absolute / previous) * 100).toFixed(1)) : null;
  return { absolute, percent, points: absolute };
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function resolveDateRange(input: KpiQueryInput = {}): ResolvedDateRange {
  const now = input.now ?? new Date();
  const today = dayKey(now.toISOString());
  const preset = input.range ?? "last_30_days";

  if (preset === "custom" && input.from && input.to) {
    const from = dayKey(input.from);
    const to = dayKey(input.to);
    const spanMs = Date.parse(`${to}T23:59:59Z`) - Date.parse(`${from}T00:00:00Z`);
    const prevTo = dayKey(new Date(Date.parse(`${from}T00:00:00Z`) - 86400000).toISOString());
    const prevFrom = dayKey(new Date(Date.parse(`${from}T00:00:00Z`) - spanMs).toISOString());
    return { preset, from, to, previousFrom: prevFrom, previousTo: prevTo };
  }

  const yesterday = dayKey(new Date(now.getTime() - 86400000).toISOString());
  const last7 = dayKey(new Date(now.getTime() - 6 * 86400000).toISOString());
  const last30 = dayKey(new Date(now.getTime() - 29 * 86400000).toISOString());
  const currentMonth = monthKey(now.toISOString());
  const prevMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const previousMonth = monthKey(prevMonthDate.toISOString());

  switch (preset) {
    case "today":
      return {
        preset,
        from: today,
        to: today,
        previousFrom: yesterday,
        previousTo: yesterday,
      };
    case "yesterday":
      return {
        preset,
        from: yesterday,
        to: yesterday,
        previousFrom: dayKey(new Date(now.getTime() - 2 * 86400000).toISOString()),
        previousTo: dayKey(new Date(now.getTime() - 2 * 86400000).toISOString()),
      };
    case "last_7_days":
      return {
        preset,
        from: last7,
        to: today,
        previousFrom: dayKey(new Date(now.getTime() - 13 * 86400000).toISOString()),
        previousTo: dayKey(new Date(now.getTime() - 7 * 86400000).toISOString()),
      };
    case "current_month":
      return {
        preset,
        from: `${currentMonth}-01`,
        to: today,
        previousFrom: `${previousMonth}-01`,
        previousTo: dayKey(new Date(Date.UTC(prevMonthDate.getUTCFullYear(), prevMonthDate.getUTCMonth() + 1, 0)).toISOString()),
      };
    case "previous_month": {
      const prevEnd = dayKey(new Date(Date.UTC(prevMonthDate.getUTCFullYear(), prevMonthDate.getUTCMonth() + 1, 0)).toISOString());
      return {
        preset,
        from: `${previousMonth}-01`,
        to: prevEnd,
        previousFrom: monthKey(new Date(Date.UTC(prevMonthDate.getUTCFullYear(), prevMonthDate.getUTCMonth() - 1, 1)).toISOString()) + "-01",
        previousTo: dayKey(new Date(Date.UTC(prevMonthDate.getUTCFullYear(), prevMonthDate.getUTCMonth(), 0)).toISOString()),
      };
    }
    case "last_30_days":
    default:
      return {
        preset: preset === "custom" ? "last_30_days" : preset,
        from: last30,
        to: today,
        previousFrom: dayKey(new Date(now.getTime() - 59 * 86400000).toISOString()),
        previousTo: dayKey(new Date(now.getTime() - 30 * 86400000).toISOString()),
      };
  }
}

export function filterEventsByRange(
  events: AnalyticsEvent[],
  from: string,
  to: string
): AnalyticsEvent[] {
  return events.filter((e) => {
    const d = dayKey(e.timestamp);
    return d >= from && d <= to;
  });
}

export function loadEventsForRange(range: ResolvedDateRange): AnalyticsEvent[] {
  const fromIso = `${range.from}T00:00:00.000Z`;
  const toIso = `${range.to}T23:59:59.999Z`;
  return listEventsInRange(fromIso, toIso);
}

export function parseKpiQueryInput(
  query: Record<string, string | undefined> = {},
): KpiQueryInput {
  const range = query.range as KpiDateRangePreset | undefined;
  const limit = query.limit ? Number.parseInt(query.limit, 10) : undefined;
  return {
    range,
    from: query.from,
    to: query.to,
    comparePrevious: query.comparePrevious === "1" || query.comparePrevious === "true",
    limit: Number.isFinite(limit) ? limit : undefined,
  };
}

export function validateKpiQuery(input: KpiQueryInput): { ok: boolean; errorCode?: string } {
  if (input.limit !== undefined && (input.limit < 1 || input.limit > MAX_LIMIT)) {
    return { ok: false, errorCode: "INVALID_LIMIT" };
  }
  if (input.range === "custom") {
    if (!input.from || !input.to) return { ok: false, errorCode: "INVALID_DATE_RANGE" };
    const fromTs = Date.parse(input.from);
    const toTs = Date.parse(input.to);
    if (Number.isNaN(fromTs) || Number.isNaN(toTs) || fromTs > toTs) {
      return { ok: false, errorCode: "INVALID_DATE_RANGE" };
    }
  }
  return { ok: true };
}

export function isAuthoritativePurchase(event: AnalyticsEvent): boolean {
  return event.eventType === "PURCHASE" && event.revenueAuthority === "AUTHORITATIVE";
}

export function isAuthoritativeRefund(event: AnalyticsEvent): boolean {
  return event.eventType === "REFUND" && event.revenueAuthority === "AUTHORITATIVE";
}

export function uniqueOrderPurchases(events: AnalyticsEvent[]): AnalyticsEvent[] {
  const seen = new Set<string>();
  const result: AnalyticsEvent[] = [];
  for (const event of events) {
    if (!isAuthoritativePurchase(event)) continue;
    const key = event.orderIdReference ?? event.eventId;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(event);
  }
  return result;
}
