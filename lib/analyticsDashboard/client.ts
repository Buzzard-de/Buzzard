import type {
  AnalyticsCategoryRow,
  AnalyticsCountryRow,
  AnalyticsDailyPoint,
  AnalyticsDashboardStatus,
  AnalyticsFunnel,
  AnalyticsProductRow,
  AnalyticsSourceRow,
  AnalyticsSummary,
} from "./types";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BUZZARD_API_URL || "").replace(/\/$/, "");
}

function adminHeaders(): HeadersInit {
  const adminToken =
    typeof window !== "undefined" ? sessionStorage.getItem("buzzard_admin_token") : null;
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
  };
}

async function adminRequest<T>(path: string): Promise<T> {
  const base = apiBase();
  if (!base) throw new Error("analyticsDashboard.apiUnavailable");
  const res = await fetch(`${base}${path}`, { headers: adminHeaders() });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "analyticsDashboard.requestFailed");
  return data;
}

export function isAnalyticsDashboardApiConfigured(): boolean {
  return Boolean(apiBase());
}

export async function fetchAnalyticsDashboardStatus(): Promise<AnalyticsDashboardStatus> {
  const base = apiBase();
  if (!base) throw new Error("analyticsDashboard.apiUnavailable");
  const res = await fetch(`${base}/api/health`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("analyticsDashboard.requestFailed");
  const data = (await res.json()) as { analyticsDashboard?: AnalyticsDashboardStatus };
  if (!data.analyticsDashboard?.enabled) throw new Error("analyticsDashboard.disabled");
  return data.analyticsDashboard;
}

export async function fetchAnalyticsSummary(): Promise<AnalyticsSummary> {
  return adminRequest<AnalyticsSummary>("/api/admin/analytics-dashboard/summary");
}

export async function fetchAnalyticsDaily(): Promise<AnalyticsDailyPoint[]> {
  return adminRequest<AnalyticsDailyPoint[]>("/api/admin/analytics-dashboard/daily");
}

export async function fetchAnalyticsCountries(): Promise<AnalyticsCountryRow[]> {
  return adminRequest<AnalyticsCountryRow[]>("/api/admin/analytics-dashboard/countries");
}

export async function fetchAnalyticsCategories(): Promise<AnalyticsCategoryRow[]> {
  return adminRequest<AnalyticsCategoryRow[]>("/api/admin/analytics-dashboard/categories");
}

export async function fetchAnalyticsProducts(): Promise<AnalyticsProductRow[]> {
  return adminRequest<AnalyticsProductRow[]>("/api/admin/analytics-dashboard/products");
}

export async function fetchAnalyticsSources(): Promise<AnalyticsSourceRow[]> {
  return adminRequest<AnalyticsSourceRow[]>("/api/admin/analytics-dashboard/sources");
}

export async function fetchAnalyticsFunnel(): Promise<AnalyticsFunnel> {
  return adminRequest<AnalyticsFunnel>("/api/admin/analytics-dashboard/funnel");
}

export async function trackAnalyticsEvent(body: {
  eventType: string;
  sessionId?: string;
  page?: string;
  productSku?: string;
  source?: string;
  countryCode?: string;
  userId?: number;
}): Promise<void> {
  const base = apiBase();
  if (!base) return;
  try {
    await fetch(`${base}/api/analytics/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    /* non-blocking */
  }
}
