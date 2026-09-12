import type { DashboardOverview } from "./types";
import type { BusinessKpiDashboard } from "./kpi/types";
import type { KpiDateRangePreset } from "./kpi/types";
import type { KpiSection } from "./kpi/query";
import {
  ANALYTICS_FOUNDATION_KPIS_PATH,
  ANALYTICS_FOUNDATION_OVERVIEW_PATH,
} from "./storefront/constants";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BUZZARD_API_URL || "").replace(/\/$/, "");
}

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? sessionStorage.getItem("buzzard_admin_token") : null;
  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchFoundationAnalyticsOverview(): Promise<DashboardOverview | null> {
  const base = apiBase();
  if (!base) return null;
  const url = `${base}${ANALYTICS_FOUNDATION_OVERVIEW_PATH}`;

  try {
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) return null;
    const json = (await res.json()) as { success?: boolean; data?: DashboardOverview };
    return json.data ?? null;
  } catch {
    return null;
  }
}

export async function fetchFoundationKpis(options: {
  range?: KpiDateRangePreset;
  from?: string;
  to?: string;
  comparePrevious?: boolean;
  limit?: number;
  section?: KpiSection;
} = {}): Promise<BusinessKpiDashboard | Partial<BusinessKpiDashboard> | null> {
  const base = apiBase();
  if (!base) return null;

  const params = new URLSearchParams();
  if (options.range) params.set("range", options.range);
  if (options.from) params.set("from", options.from);
  if (options.to) params.set("to", options.to);
  if (options.comparePrevious) params.set("comparePrevious", "true");
  if (options.limit) params.set("limit", String(options.limit));
  if (options.section) params.set("section", options.section);

  const query = params.toString();
  const url = `${base}${ANALYTICS_FOUNDATION_KPIS_PATH}${query ? `?${query}` : ""}`;

  try {
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      success?: boolean;
      data?: BusinessKpiDashboard | Partial<BusinessKpiDashboard>;
    };
    return json.data ?? null;
  } catch {
    return null;
  }
}
