import type {
  MarketingCampaignRow,
  MarketingLoyaltyOverview,
  MarketingLoyaltyStatus,
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

async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiBase();
  if (!base) throw new Error("marketingLoyalty.apiUnavailable");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...adminHeaders(), ...(init?.headers || {}) },
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "marketingLoyalty.requestFailed");
  return data;
}

export function isMarketingLoyaltyApiConfigured(): boolean {
  return Boolean(apiBase());
}

export async function fetchMarketingLoyaltyStatus(): Promise<MarketingLoyaltyStatus> {
  const base = apiBase();
  if (!base) throw new Error("marketingLoyalty.apiUnavailable");
  const res = await fetch(`${base}/api/health`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("marketingLoyalty.requestFailed");
  const data = (await res.json()) as { marketingLoyalty?: MarketingLoyaltyStatus };
  if (!data.marketingLoyalty?.enabled) throw new Error("marketingLoyalty.disabled");
  return data.marketingLoyalty;
}

export async function fetchMarketingLoyaltyOverview(): Promise<MarketingLoyaltyOverview> {
  return adminRequest<MarketingLoyaltyOverview>("/api/admin/marketing-loyalty/overview");
}

export async function fetchMarketingCampaigns(): Promise<MarketingCampaignRow[]> {
  return adminRequest<MarketingCampaignRow[]>("/api/marketing-loyalty/campaigns");
}
