import { browserFetch } from "@/lib/security/browserFetch";
import { apiBaseUrl } from "@/lib/api/config";

const ADMIN_TOKEN_KEY = "buzzard_admin_token";

function adminHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? sessionStorage.getItem(ADMIN_TOKEN_KEY) : null;
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchEu27LogisticsStatus(): Promise<Record<string, unknown>> {
  const base = apiBaseUrl();
  if (!base) throw new Error("admin.apiUnavailable");
  const res = await browserFetch(`${base}/api/admin/eu27-logistics/status`, {
    headers: adminHeaders(),
  });
  const data = (await res.json()) as { error?: string; snapshot?: Record<string, unknown> };
  if (!res.ok) throw new Error(data.error || "eu27.logistics.requestFailed");
  return data.snapshot || data;
}
