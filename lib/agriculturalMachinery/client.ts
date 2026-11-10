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

export function isAgriculturalMachineryApiConfigured(): boolean {
  return Boolean(apiBase());
}

export async function searchAgriculturalMachinery(params: Record<string, string>) {
  const base = apiBase();
  if (!base) throw new Error("agriculturalMachinery.apiUnavailable");
  const res = await fetch(`${base}/api/agricultural-machinery/search?${new URLSearchParams(params)}`, {
    headers: { Accept: "application/json" },
  });
  return res.json();
}

export async function evaluateAgriculturalCompatibility(body: Record<string, unknown>) {
  const base = apiBase();
  if (!base) throw new Error("agriculturalMachinery.apiUnavailable");
  const res = await fetch(`${base}/api/agricultural-machinery/compatibility`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function fetchAgriculturalAdminOverview() {
  const base = apiBase();
  if (!base) throw new Error("agriculturalMachinery.apiUnavailable");
  const res = await fetch(`${base}/api/admin/agricultural-machinery/overview`, { headers: adminHeaders() });
  return res.json();
}

export async function importMockAgriculturalCatalog() {
  const base = apiBase();
  if (!base) throw new Error("agriculturalMachinery.apiUnavailable");
  const res = await fetch(`${base}/api/admin/agricultural-machinery/import`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ connectorId: "mock-ag-local" }),
  });
  return res.json();
}
