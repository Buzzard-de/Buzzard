import type { MarketplaceV35Overview, MarketplaceV35Record, MarketplaceV35Status } from "./types";
import { withAdminCredentials } from "@/lib/admin/authTransport";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BUZZARD_API_URL || "").replace(/\/$/, "");
}


async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiBase();
  if (!base) throw new Error("marketplaceV35.apiUnavailable");
  const res = await fetch(`${base}${path}`, withAdminCredentials(init));
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.errorKey || "marketplaceV35.requestFailed");
  return data;
}

export async function fetchMarketplaceV35Status(): Promise<MarketplaceV35Status> {
  const base = apiBase();
  if (!base) throw new Error("marketplaceV35.apiUnavailable");
  const res = await fetch(`${base}/api/health`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("marketplaceV35.requestFailed");
  const data = (await res.json()) as { marketplaceV35?: MarketplaceV35Status };
  if (!data.marketplaceV35?.enabled) throw new Error("marketplaceV35.disabled");
  return data.marketplaceV35;
}

export async function fetchMarketplaceV35Overview(): Promise<MarketplaceV35Overview> {
  return adminRequest<MarketplaceV35Overview>("/api/admin/marketplace-v35/overview");
}

export async function fetchMarketplaceV35Records(): Promise<MarketplaceV35Record[]> {
  return adminRequest<MarketplaceV35Record[]>("/api/marketplace-v35/records");
}
