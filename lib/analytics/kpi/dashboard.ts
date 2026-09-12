/**
 * Admin KPI dashboard handlers.
 */

import type { AdminAnalyticsContext } from "../types";
import { validateAdminAccess } from "../security";
import { recordAnalyticsAudit } from "../audit";
import { computeBusinessKpis } from "./compute";
import {
  parseKpiQueryInput,
  validateKpiQuery,
  type KpiQueryInput,
  type KpiSection,
} from "./query";
import type { BusinessKpiDashboard } from "./types";

function requireAdmin(context: AdminAnalyticsContext): { ok: true } | { ok: false; errorCode: string } {
  const check = validateAdminAccess(context);
  if (!check.ok) return { ok: false, errorCode: check.errorCode ?? "ADMIN_UNAUTHORIZED" };
  recordAnalyticsAudit({
    action: "KPI_DASHBOARD_ACCESS",
    actor: context.actorId ?? "ADMIN",
  });
  return { ok: true };
}

function parseInput(query: Record<string, string | undefined> = {}): KpiQueryInput {
  return parseKpiQueryInput(query);
}

export function getBusinessKpiDashboard(
  context: AdminAnalyticsContext,
  query: Record<string, string | undefined> = {},
): { ok: true; data: BusinessKpiDashboard } | { ok: false; errorCode: string } {
  const auth = requireAdmin(context);
  if (!auth.ok) return auth;

  const input = parseInput(query);
  const validation = validateKpiQuery(input);
  if (!validation.ok) return { ok: false, errorCode: validation.errorCode ?? "INVALID_QUERY" };

  return { ok: true, data: computeBusinessKpis(input) };
}

export function getBusinessKpiSection(
  context: AdminAnalyticsContext,
  section: KpiSection,
  query: Record<string, string | undefined> = {},
): { ok: true; data: Record<string, unknown> } | { ok: false; errorCode: string } {
  const result = getBusinessKpiDashboard(context, query);
  if (!result.ok) return result;

  const dashboard = result.data;
  switch (section) {
    case "executive":
      return {
        ok: true,
        data: {
          range: dashboard.range,
          executive: dashboard.executive,
          previousExecutive: dashboard.previousExecutive,
          deltas: dashboard.deltas,
        },
      };
    case "funnel":
      return { ok: true, data: { range: dashboard.range, funnel: dashboard.funnel } };
    case "products":
      return {
        ok: true,
        data: {
          range: dashboard.range,
          products: dashboard.products,
          rankings: {
            productsByRevenue: dashboard.rankings.productsByRevenue,
            productsByUnits: dashboard.rankings.productsByUnits,
            productsByConversion: dashboard.rankings.productsByConversion,
            productsByMargin: dashboard.rankings.productsByMargin,
          },
        },
      };
    case "categories":
      return {
        ok: true,
        data: {
          range: dashboard.range,
          categories: dashboard.categories,
          rankings: { categoriesByRevenue: dashboard.rankings.categoriesByRevenue },
        },
      };
    case "markets":
      return {
        ok: true,
        data: {
          range: dashboard.range,
          markets: dashboard.markets,
          rankings: { marketsByRevenue: dashboard.rankings.marketsByRevenue },
        },
      };
    case "channels":
      return {
        ok: true,
        data: {
          range: dashboard.range,
          channels: dashboard.channels,
          rankings: { channelsByRevenue: dashboard.rankings.channelsByRevenue },
        },
      };
    case "traffic":
      return { ok: true, data: { range: dashboard.range, traffic: dashboard.traffic } };
    case "returns":
      return { ok: true, data: { range: dashboard.range, returns: dashboard.returns } };
    case "profitability":
      return { ok: true, data: { range: dashboard.range, profitability: dashboard.profitability } };
    default:
      return { ok: true, data: dashboard as unknown as Record<string, unknown> };
  }
}

export type { KpiQueryInput, KpiSection };
