import type {
  FinanceAuditEvent,
  FinanceInvoice,
  FinanceOverview,
  FinanceRefund,
  PaymentIntentRow,
  PaymentsFinanceStatus,
} from "./types";

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
  if (!base) throw new Error("paymentsFinance.apiUnavailable");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...adminHeaders(), ...(init?.headers || {}) },
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "paymentsFinance.requestFailed");
  return data;
}

export function isPaymentsFinanceApiConfigured(): boolean {
  return Boolean(apiBase());
}

export async function fetchPaymentsFinanceStatus(): Promise<PaymentsFinanceStatus> {
  const base = apiBase();
  if (!base) throw new Error("paymentsFinance.apiUnavailable");
  const res = await fetch(`${base}/api/health`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("paymentsFinance.requestFailed");
  const data = (await res.json()) as { paymentsFinance?: PaymentsFinanceStatus };
  if (!data.paymentsFinance?.enabled) throw new Error("paymentsFinance.disabled");
  return data.paymentsFinance;
}

export async function fetchFinanceOverview(): Promise<FinanceOverview> {
  return adminRequest<FinanceOverview>("/api/admin/payments-finance/overview");
}

export async function fetchFinancePayments(): Promise<PaymentIntentRow[]> {
  return adminRequest<PaymentIntentRow[]>("/api/admin/payments-finance/payments");
}

export async function fetchFinanceRefunds(): Promise<FinanceRefund[]> {
  return adminRequest<FinanceRefund[]>("/api/admin/payments-finance/refunds");
}

export async function fetchFinanceInvoices(): Promise<FinanceInvoice[]> {
  return adminRequest<FinanceInvoice[]>("/api/admin/payments-finance/invoices");
}

export async function fetchFinanceAudit(): Promise<FinanceAuditEvent[]> {
  return adminRequest<FinanceAuditEvent[]>("/api/admin/payments-finance/audit");
}
