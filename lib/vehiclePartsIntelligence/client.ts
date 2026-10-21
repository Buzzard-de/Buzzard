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

export function isVehiclePartsApiConfigured(): boolean {
  return Boolean(apiBase());
}

export async function searchVehicleParts(params: Record<string, string>) {
  const base = apiBase();
  if (!base) throw new Error("vehicleParts.apiUnavailable");
  const res = await fetch(`${base}/api/vehicle-parts/search?${new URLSearchParams(params)}`, {
    headers: { Accept: "application/json" },
  });
  return res.json();
}

export async function evaluateVehicleCompatibility(body: Record<string, unknown>) {
  const base = apiBase();
  if (!base) throw new Error("vehicleParts.apiUnavailable");
  const res = await fetch(`${base}/api/vehicle-parts/compatibility`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function fetchVehiclePartsAdminOverview() {
  const base = apiBase();
  if (!base) throw new Error("vehicleParts.apiUnavailable");
  const res = await fetch(`${base}/api/admin/vehicle-parts/overview`, { headers: adminHeaders() });
  return res.json();
}

export async function importMockVehicleCatalog() {
  const base = apiBase();
  if (!base) throw new Error("vehicleParts.apiUnavailable");
  const res = await fetch(`${base}/api/admin/vehicle-parts/import`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ connectorId: "mock-vpe-local" }),
  });
  return res.json();
}
