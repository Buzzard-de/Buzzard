import type { MasterAdminV40Overview, MasterAdminV40Record, MasterAdminV40Status } from "./types";
import { withAdminCredentials } from "@/lib/admin/authTransport";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BUZZARD_API_URL || "").replace(/\/$/, "");
}


async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiBase();
  if (!base) throw new Error("masterAdminV40.apiUnavailable");
  const res = await fetch(`${base}${path}`, withAdminCredentials(init));
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "masterAdminV40.requestFailed");
  return data;
}

export async function fetchMasterAdminV40Status(): Promise<MasterAdminV40Status> {
  const base = apiBase();
  if (!base) throw new Error("masterAdminV40.apiUnavailable");
  const res = await fetch(`${base}/api/health`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("masterAdminV40.requestFailed");
  const data = (await res.json()) as { masterAdminV40?: MasterAdminV40Status };
  if (!data.masterAdminV40?.enabled) throw new Error("masterAdminV40.disabled");
  return data.masterAdminV40;
}

export async function fetchMasterAdminV40Overview(): Promise<MasterAdminV40Overview> {
  return adminRequest<MasterAdminV40Overview>("/api/admin/master-admin-v40/overview");
}

export async function fetchMasterAdminV40Records(): Promise<MasterAdminV40Record[]> {
  return adminRequest<MasterAdminV40Record[]>("/api/master-admin-v40/records");
}
