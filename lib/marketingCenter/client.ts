import type {
  CreateCampaignInput,
  MarketingCampaign,
  MarketingCenterStatus,
  MarketingChannelRow,
  MarketingProvider,
  MarketingSummary,
  MarketingUtmRow,
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
  if (!base) throw new Error("marketingCenter.apiUnavailable");
  const res = await fetch(`${base}${path}`, { ...init, headers: { ...adminHeaders(), ...(init?.headers || {}) } });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "marketingCenter.requestFailed");
  return data;
}

export function isMarketingCenterApiConfigured(): boolean {
  return Boolean(apiBase());
}

export async function fetchMarketingCenterStatus(): Promise<MarketingCenterStatus> {
  const base = apiBase();
  if (!base) throw new Error("marketingCenter.apiUnavailable");
  const res = await fetch(`${base}/api/health`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("marketingCenter.requestFailed");
  const data = (await res.json()) as { marketingCenter?: MarketingCenterStatus };
  if (!data.marketingCenter?.enabled) throw new Error("marketingCenter.disabled");
  return data.marketingCenter;
}

export async function fetchMarketingSummary(): Promise<MarketingSummary> {
  return adminRequest<MarketingSummary>("/api/admin/marketing-center/summary");
}

export async function fetchMarketingCampaigns(): Promise<MarketingCampaign[]> {
  return adminRequest<MarketingCampaign[]>("/api/admin/marketing-center/campaigns");
}

export async function fetchMarketingChannels(): Promise<MarketingChannelRow[]> {
  return adminRequest<MarketingChannelRow[]>("/api/admin/marketing-center/channels");
}

export async function fetchMarketingUtm(): Promise<MarketingUtmRow[]> {
  return adminRequest<MarketingUtmRow[]>("/api/admin/marketing-center/utm");
}

export async function fetchMarketingProviders(): Promise<MarketingProvider[]> {
  return adminRequest<MarketingProvider[]>("/api/admin/marketing-center/providers");
}

export async function createMarketingCampaign(input: CreateCampaignInput): Promise<MarketingCampaign> {
  return adminRequest<MarketingCampaign>("/api/admin/marketing-center/campaigns", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateMarketingProvider(
  provider: string,
  body: { enabled?: boolean; accountLabel?: string }
): Promise<MarketingProvider> {
  return adminRequest<MarketingProvider>(`/api/admin/marketing-center/providers/${encodeURIComponent(provider)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function trackMarketingCenterEvent(body: {
  eventType: string;
  sessionId?: string;
  campaign?: string;
  source?: string;
  medium?: string;
  countryCode?: string;
  productSku?: string;
}): Promise<void> {
  const base = apiBase();
  if (!base) return;
  try {
    await fetch(`${base}/api/marketing-center/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    /* non-blocking */
  }
}

export async function recordMarketingConversion(body: {
  campaignId: number;
  orderNumber: string;
  revenue?: number;
  currency?: string;
  source?: string;
}): Promise<void> {
  const base = apiBase();
  if (!base) return;
  try {
    await fetch(`${base}/api/marketing-center/conversion`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    /* non-blocking */
  }
}
