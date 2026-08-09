import type { CommercialIntegrationStatus, FxRate, TaxQuote, TecDocCompatibility } from "./types";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BUZZARD_API_URL || "").replace(/\/$/, "");
}

function authHeaders(): HeadersInit {
  const accountToken =
    typeof window !== "undefined" ? sessionStorage.getItem("buzzard_account_token") : null;
  const adminToken =
    typeof window !== "undefined" ? sessionStorage.getItem("buzzard_admin_token") : null;
  const token = adminToken || accountToken;
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiBase();
  if (!base) throw new Error("integrations.apiUnavailable");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "integrations.requestFailed");
  return data;
}

export function isIntegrationsApiConfigured(): boolean {
  return Boolean(apiBase());
}

export async function fetchIntegrationStatus(): Promise<CommercialIntegrationStatus> {
  return request<CommercialIntegrationStatus>("/api/admin/integrations");
}

export async function fetchTaxQuote(body: {
  countryCode: string;
  netAmount: number;
  shipping?: number;
}): Promise<TaxQuote> {
  return request<TaxQuote>("/api/tax/quote", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchFxRate(from = "EUR", to = "EUR"): Promise<FxRate> {
  const base = apiBase();
  if (!base) throw new Error("integrations.apiUnavailable");
  const url = new URL(`${base}/api/fx/rate`);
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);
  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("integrations.fxFailed");
  return (await res.json()) as FxRate;
}

export async function checkTecDocCompatibility(body: {
  vehicle: unknown;
  productSku: string;
}): Promise<TecDocCompatibility> {
  const base = apiBase();
  if (!base) throw new Error("integrations.apiUnavailable");
  const res = await fetch(`${base}/api/tecdoc/compatibility`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("integrations.tecdocFailed");
  return (await res.json()) as TecDocCompatibility;
}
