/**
 * Business KPI aggregator — wires all KPI modules over persistent analytics events.
 */

import {
  resolveDateRange,
  loadEventsForRange,
  clampLimit,
  safeDelta,
  type KpiQueryInput,
} from "./query";
import { computeExecutiveKpis } from "./executive";
import { computeFunnelKpis } from "./funnelKpi";
import {
  computeProductKpis,
  computeCategoryKpis,
  computeMarketKpis,
  computeLanguageKpis,
  computeCommerceChannelKpis,
  computeTrafficSourceKpis,
  computeDeviceKpis,
} from "./intelligence";
import { computeCustomerKpis, computeCohortKpis } from "./customerCohort";
import { computeReturnKpis } from "./returnsKpi";
import { computeProfitabilityKpis } from "./profitability";
import { buildRankings } from "./rankings";
import type { BusinessKpiDashboard, ExecutiveKpis } from "./types";

export function computeBusinessKpis(input: KpiQueryInput = {}): BusinessKpiDashboard {
  const range = resolveDateRange(input);
  const events = loadEventsForRange(range);
  const limit = clampLimit(input.limit);

  const executive = computeExecutiveKpis(events);
  const funnel = computeFunnelKpis(events);
  const products = computeProductKpis(events, limit);
  const categories = computeCategoryKpis(events, limit);
  const markets = computeMarketKpis(events);
  const languages = computeLanguageKpis(events);
  const channels = computeCommerceChannelKpis(events);
  const traffic = computeTrafficSourceKpis(events);
  const devices = computeDeviceKpis(events);
  const customers = computeCustomerKpis(events);
  const cohorts = computeCohortKpis(events);
  const returns = computeReturnKpis(events);
  const profitability = computeProfitabilityKpis(events);
  const rankings = buildRankings(products, categories, markets, channels, limit);

  let previousExecutive: Partial<ExecutiveKpis> | undefined;
  let deltas: BusinessKpiDashboard["deltas"];

  if (input.comparePrevious && range.previousFrom && range.previousTo) {
    const prevEvents = loadEventsForRange({
      preset: range.preset,
      from: range.previousFrom,
      to: range.previousTo,
    });
    previousExecutive = computeExecutiveKpis(prevEvents);
    deltas = {
      orders: safeDelta(executive.orders, previousExecutive.orders ?? 0),
      grossRevenueCents: safeDelta(executive.grossRevenueCents, previousExecutive.grossRevenueCents ?? 0),
      authoritativeRevenueCents: safeDelta(
        executive.authoritativeRevenueCents,
        previousExecutive.authoritativeRevenueCents ?? 0,
      ),
      netRevenueCents: safeDelta(executive.netRevenueCents, previousExecutive.netRevenueCents ?? 0),
      conversionRate: safeDelta(executive.conversionRate, previousExecutive.conversionRate ?? 0),
      averageOrderValueCents: safeDelta(
        executive.averageOrderValueCents,
        previousExecutive.averageOrderValueCents ?? 0,
      ),
    };
  }

  return {
    range,
    executive,
    previousExecutive,
    deltas,
    funnel,
    products,
    categories,
    markets,
    languages,
    channels,
    traffic,
    devices,
    customers,
    cohorts,
    returns,
    profitability,
    rankings,
  };
}
