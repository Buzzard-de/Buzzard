export interface GlobalCatalogHealth {
  ready: boolean;
  status: string;
  countries: { configured: number; expected: number; list: string[] };
  languages: { configured: number; uiReady: string[]; prepared: string[] };
  currencies: { configured: number; codes: string[] };
  products: Record<string, number>;
  countryMatrix: Array<Record<string, unknown>>;
  blockers: Array<{ code: string }>;
  safety: Record<string, unknown>;
}

const TOKEN_KEY = "buzzard_admin_token";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BUZZARD_API_URL || "").replace(/\/$/, "");
}

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? sessionStorage.getItem(TOKEN_KEY) : null;
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string): Promise<T> {
  const base = apiBase();
  if (!base) throw new Error("admin.apiUnavailable");
  const res = await fetch(`${base}${path}`, { headers: authHeaders() });
  const data = (await res.json()) as T & { success?: boolean; errorKey?: string; message?: string };
  if (!res.ok) throw new Error(data.errorKey || data.message || "admin.requestFailed");
  return data;
}

export async function fetchGlobalCatalogHealth(): Promise<GlobalCatalogHealth> {
  const data = await request<{ health: GlobalCatalogHealth }>("/api/admin/pim-core/global-catalog-health");
  return data.health;
}

export async function fetchCountryMatrix() {
  const data = await request<{ matrix: Array<Record<string, unknown>> }>("/api/admin/pim-core/country-matrix");
  return data.matrix;
}

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY);
}
