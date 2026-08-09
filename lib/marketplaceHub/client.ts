import type {
  MarketplaceChannel,
  MarketplaceChannelOrder,
  MarketplaceHubStatus,
  MarketplaceSyncJob,
  UpsertListingInput,
  UpsertSkuMapInput,
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
  if (!base) throw new Error("marketplaceHub.apiUnavailable");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...adminHeaders(), ...(init?.headers || {}) },
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "marketplaceHub.requestFailed");
  return data;
}

export function isMarketplaceHubApiConfigured(): boolean {
  return Boolean(apiBase());
}

export async function fetchMarketplaceHubStatus(): Promise<MarketplaceHubStatus> {
  const base = apiBase();
  if (!base) throw new Error("marketplaceHub.apiUnavailable");
  const res = await fetch(`${base}/api/health`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("marketplaceHub.requestFailed");
  const data = (await res.json()) as { marketplaceHub?: MarketplaceHubStatus };
  if (!data.marketplaceHub?.enabled) throw new Error("marketplaceHub.disabled");
  return data.marketplaceHub;
}

export async function fetchMarketplaces(): Promise<MarketplaceChannel[]> {
  return adminRequest<MarketplaceChannel[]>("/api/admin/marketplace-hub/marketplaces");
}

export async function fetchMarketplaceSyncJobs(): Promise<MarketplaceSyncJob[]> {
  return adminRequest<MarketplaceSyncJob[]>("/api/admin/marketplace-hub/sync-jobs");
}

export async function fetchMarketplaceChannelOrders(): Promise<MarketplaceChannelOrder[]> {
  return adminRequest<MarketplaceChannelOrder[]>("/api/admin/marketplace-hub/channel-orders");
}

export async function updateMarketplace(
  code: string,
  body: { enabled?: boolean; accountLabel?: string }
): Promise<MarketplaceChannel> {
  return adminRequest<MarketplaceChannel>(`/api/admin/marketplace-hub/marketplaces/${encodeURIComponent(code)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function queueMarketplaceSync(type: "stock" | "prices" | "orders"): Promise<{ queued: number }> {
  return adminRequest<{ queued: number }>(`/api/admin/marketplace-hub/sync/${type}`, {
    method: "POST",
    body: "{}",
  });
}

export async function upsertMarketplaceListing(input: UpsertListingInput): Promise<{ ok: boolean }> {
  return adminRequest<{ ok: boolean }>("/api/admin/marketplace-hub/listings", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function upsertMarketplaceSkuMap(input: UpsertSkuMapInput): Promise<{ ok: boolean }> {
  return adminRequest<{ ok: boolean }>("/api/admin/marketplace-hub/sku-map", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
