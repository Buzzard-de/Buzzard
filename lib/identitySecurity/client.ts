import { withAdminCredentials } from "@/lib/admin/authTransport";
import type {
  IdentityAccount,
  IdentitySecurityAuditEvent,
  IdentitySecurityOverview,
  IdentitySecurityStatus,
  IdentitySessionRow,
} from "./types";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BUZZARD_API_URL || "").replace(/\/$/, "");
}


async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiBase();
  if (!base) throw new Error("identitySecurity.apiUnavailable");
  const res = await fetch(`${base}${path}`, withAdminCredentials(init));
  const data = (await res.json()) as T & { errorKey?: string };
  if (!res.ok) throw new Error(data.errorKey || "identitySecurity.requestFailed");
  return data;
}

export function isIdentitySecurityApiConfigured(): boolean {
  return Boolean(apiBase());
}

export async function fetchIdentitySecurityStatus(): Promise<IdentitySecurityStatus> {
  const base = apiBase();
  if (!base) throw new Error("identitySecurity.apiUnavailable");
  const res = await fetch(`${base}/api/health`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("identitySecurity.requestFailed");
  const data = (await res.json()) as { identitySecurity?: IdentitySecurityStatus };
  if (!data.identitySecurity?.enabled) throw new Error("identitySecurity.disabled");
  return data.identitySecurity;
}

export async function fetchIdentitySecurityOverview(): Promise<IdentitySecurityOverview> {
  return adminRequest<IdentitySecurityOverview>("/api/admin/identity-security/overview");
}

export async function fetchIdentitySecurityAudit(): Promise<IdentitySecurityAuditEvent[]> {
  return adminRequest<IdentitySecurityAuditEvent[]>("/api/admin/identity-security/audit");
}

export async function fetchIdentitySessions(): Promise<IdentitySessionRow[]> {
  return adminRequest<IdentitySessionRow[]>("/api/admin/identity-security/sessions");
}

export async function fetchIdentityAccount(): Promise<IdentityAccount | null> {
  const base = apiBase();
  if (!base) return null;
  const res = await fetch(`${base}/api/identity-security/account`, withAdminCredentials());
  if (!res.ok) return null;
  return (await res.json()) as IdentityAccount;
}
