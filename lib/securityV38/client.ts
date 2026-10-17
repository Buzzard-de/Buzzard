import type { SecurityV38Overview, SecurityV38Record, SecurityV38Status } from "./types";
import { withAdminCredentials } from "@/lib/admin/authTransport";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BUZZARD_API_URL || "").replace(/\/$/, "");
}


async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiBase();
  if (!base) throw new Error("securityV38.apiUnavailable");
  const res = await fetch(`${base}${path}`, withAdminCredentials(init));
  const data = (await res.json()) as T & { errorKey?: string };
  if (!res.ok) throw new Error(data.errorKey || "securityV38.requestFailed");
  return data;
}

export async function fetchSecurityV38Status(): Promise<SecurityV38Status> {
  const base = apiBase();
  if (!base) throw new Error("securityV38.apiUnavailable");
  const res = await fetch(`${base}/api/health`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("securityV38.requestFailed");
  const data = (await res.json()) as { securityV38?: SecurityV38Status };
  if (!data.securityV38?.enabled) throw new Error("securityV38.disabled");
  return data.securityV38;
}

export async function fetchSecurityV38Overview(): Promise<SecurityV38Overview> {
  return adminRequest<SecurityV38Overview>("/api/admin/security-v38/overview");
}

export async function fetchSecurityV38Records(): Promise<SecurityV38Record[]> {
  return adminRequest<SecurityV38Record[]>("/api/security-v38/records");
}
