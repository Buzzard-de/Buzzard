import type { DashboardOverview } from "./types";
import { ANALYTICS_FOUNDATION_OVERVIEW_PATH } from "./storefront/constants";

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
