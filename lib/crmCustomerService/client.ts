import type { CrmCustomerRow, CrmOverview, CrmCustomerServiceStatus, CrmTicketRow } from "./types";

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
  if (!base) throw new Error("crmCustomerService.apiUnavailable");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...adminHeaders(), ...(init?.headers || {}) },
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "crmCustomerService.requestFailed");
  return data;
}

export function isCrmCustomerServiceApiConfigured(): boolean {
  return Boolean(apiBase());
}

export async function fetchCrmCustomerServiceStatus(): Promise<CrmCustomerServiceStatus> {
  const base = apiBase();
  if (!base) throw new Error("crmCustomerService.apiUnavailable");
  const res = await fetch(`${base}/api/health`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("crmCustomerService.requestFailed");
  const data = (await res.json()) as { crmCustomerService?: CrmCustomerServiceStatus };
  if (!data.crmCustomerService?.enabled) throw new Error("crmCustomerService.disabled");
  return data.crmCustomerService;
}

export async function fetchCrmOverview(): Promise<CrmOverview> {
  return adminRequest<CrmOverview>("/api/admin/crm-customer-service/overview");
}

export async function fetchCrmCustomers(search = "", segment = "", status = ""): Promise<CrmCustomerRow[]> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (segment) params.set("segment", segment);
  if (status) params.set("status", status);
  const query = params.toString();
  return adminRequest<CrmCustomerRow[]>(`/api/admin/crm-customer-service/customers${query ? `?${query}` : ""}`);
}

export async function fetchCrmTickets(search = "", status = "", priority = ""): Promise<CrmTicketRow[]> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  if (priority) params.set("priority", priority);
  const query = params.toString();
  return adminRequest<CrmTicketRow[]>(`/api/admin/crm-customer-service/tickets${query ? `?${query}` : ""}`);
}
