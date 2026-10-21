import type { ConstructionHealth, ConstructionSearchResponse } from "./types";

import { machineryApiBase } from "@/lib/machineryApi";

function apiBase(): string {
  return machineryApiBase();
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

export function isConstructionMachineryApiConfigured(): boolean {
  return Boolean(apiBase());
}

export async function searchConstructionMachinery(params: Record<string, string>): Promise<ConstructionSearchResponse> {
  const base = apiBase();
  if (!base) throw new Error("constructionMachinery.apiUnavailable");
  const query = new URLSearchParams(params);
  const res = await fetch(`${base}/api/construction-machinery/search?${query.toString()}`, {
    headers: { Accept: "application/json" },
  });
  const data = (await res.json()) as ConstructionSearchResponse & { error?: string };
  if (!res.ok) throw new Error(data.error || "constructionMachinery.requestFailed");
  return data;
}

export async function evaluateConstructionCompatibility(body: Record<string, unknown>) {
  const base = apiBase();
  if (!base) throw new Error("constructionMachinery.apiUnavailable");
  const res = await fetch(`${base}/api/construction-machinery/compatibility`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function fetchConstructionHealth(): Promise<ConstructionHealth> {
  const base = apiBase();
  if (!base) throw new Error("constructionMachinery.apiUnavailable");
  const res = await fetch(`${base}/api/construction-machinery/health`, {
    headers: { Accept: "application/json" },
  });
  return (await res.json()) as ConstructionHealth;
}

export async function importMockConstructionCatalog() {
  const base = apiBase();
  if (!base) throw new Error("constructionMachinery.apiUnavailable");
  const res = await fetch(`${base}/api/admin/construction-machinery/import`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ connectorId: "mock-local" }),
  });
  return res.json();
}

export async function fetchConstructionAdminOverview() {
  const base = apiBase();
  if (!base) throw new Error("constructionMachinery.apiUnavailable");
  const res = await fetch(`${base}/api/admin/construction-machinery/overview`, {
    headers: adminHeaders(),
  });
  return res.json();
}
