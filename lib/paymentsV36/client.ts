import type { PaymentsV36Overview, PaymentsV36Record, PaymentsV36Status } from "./types";

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
  if (!base) throw new Error("paymentsV36.apiUnavailable");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...adminHeaders(), ...(init?.headers || {}) },
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "paymentsV36.requestFailed");
  return data;
}

export async function fetchPaymentsV36Status(): Promise<PaymentsV36Status> {
  const base = apiBase();
  if (!base) throw new Error("paymentsV36.apiUnavailable");
  const res = await fetch(`${base}/api/health`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("paymentsV36.requestFailed");
  const data = (await res.json()) as { paymentsV36?: PaymentsV36Status };
  if (!data.paymentsV36?.enabled) throw new Error("paymentsV36.disabled");
  return data.paymentsV36;
}

export async function fetchPaymentsV36Overview(): Promise<PaymentsV36Overview> {
  return adminRequest<PaymentsV36Overview>("/api/admin/payments-v36/overview");
}

export async function fetchPaymentsV36Records(): Promise<PaymentsV36Record[]> {
  return adminRequest<PaymentsV36Record[]>("/api/payments-v36/records");
}
