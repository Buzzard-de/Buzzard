import type { FulfillmentV33Overview, FulfillmentV33Record, FulfillmentV33Status } from "./types";
import { withAdminCredentials } from "@/lib/admin/authTransport";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BUZZARD_API_URL || "").replace(/\/$/, "");
}


async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiBase();
  if (!base) throw new Error("fulfillmentV33.apiUnavailable");
  const res = await fetch(`${base}${path}`, withAdminCredentials(init));
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.errorKey || "fulfillmentV33.requestFailed");
  return data;
}

export async function fetchFulfillmentV33Status(): Promise<FulfillmentV33Status> {
  const base = apiBase();
  if (!base) throw new Error("fulfillmentV33.apiUnavailable");
  const res = await fetch(`${base}/api/health`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("fulfillmentV33.requestFailed");
  const data = (await res.json()) as { fulfillmentV33?: FulfillmentV33Status };
  if (!data.fulfillmentV33?.enabled) throw new Error("fulfillmentV33.disabled");
  return data.fulfillmentV33;
}

export async function fetchFulfillmentV33Overview(): Promise<FulfillmentV33Overview> {
  return adminRequest<FulfillmentV33Overview>("/api/admin/fulfillment-v33/overview");
}

export async function fetchFulfillmentV33Records(): Promise<FulfillmentV33Record[]> {
  return adminRequest<FulfillmentV33Record[]>("/api/fulfillment-v33/records");
}
