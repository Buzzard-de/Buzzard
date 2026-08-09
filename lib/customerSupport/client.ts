import { getAccountToken } from "@/lib/account/client";
import type {
  CustomerSupportStatus,
  OrderTrackingTimeline,
  SupportTemplate,
  SupportTicket,
  TicketMessage,
} from "./types";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BUZZARD_API_URL || "").replace(/\/$/, "");
}

function authHeaders(): HeadersInit {
  const adminToken =
    typeof window !== "undefined" ? sessionStorage.getItem("buzzard_admin_token") : null;
  const accountToken = getAccountToken();
  const token = adminToken || accountToken;
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiBase();
  if (!base) throw new Error("customerSupport.apiUnavailable");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "customerSupport.requestFailed");
  return data;
}

export function isCustomerSupportApiConfigured(): boolean {
  return Boolean(apiBase());
}

export async function fetchCustomerSupportStatus(): Promise<CustomerSupportStatus> {
  const base = apiBase();
  if (!base) throw new Error("customerSupport.apiUnavailable");
  const res = await fetch(`${base}/api/health`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("customerSupport.requestFailed");
  const data = (await res.json()) as { customerSupport?: CustomerSupportStatus };
  if (!data.customerSupport?.enabled) throw new Error("customerSupport.disabled");
  return data.customerSupport;
}

export async function createSupportTicket(body: {
  subject: string;
  message: string;
  orderNumber?: string;
  category?: string;
  priority?: string;
}): Promise<{ id: number; ticketNumber: string; status: string }> {
  return request("/api/customer/support/tickets", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchSupportTickets(): Promise<SupportTicket[]> {
  return request<SupportTicket[]>("/api/customer/support/tickets");
}

export async function fetchSupportTicket(
  ticketId: number | string
): Promise<{ ticket: SupportTicket; messages: TicketMessage[] }> {
  return request(`/api/customer/support/tickets/${encodeURIComponent(String(ticketId))}`);
}

export async function replyToSupportTicket(
  ticketId: number | string,
  message: string
): Promise<void> {
  await request(`/api/customer/support/tickets/${encodeURIComponent(String(ticketId))}/messages`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export async function fetchOrderTracking(orderNumber: string): Promise<OrderTrackingTimeline> {
  return request<OrderTrackingTimeline>(
    `/api/customer/orders/${encodeURIComponent(orderNumber)}/tracking`
  );
}

export async function fetchAdminCustomerSupportStatus(): Promise<CustomerSupportStatus> {
  return request<CustomerSupportStatus>("/api/admin/customer-support/status");
}

export async function fetchAdminSupportTickets(): Promise<SupportTicket[]> {
  return request<SupportTicket[]>("/api/admin/customer-support/tickets");
}

export async function fetchAdminSupportTicket(
  ticketId: number | string
): Promise<{ ticket: SupportTicket; messages: TicketMessage[] }> {
  return request(`/api/admin/customer-support/tickets/${encodeURIComponent(String(ticketId))}`);
}

export async function replyAdminSupportTicket(
  ticketId: number | string,
  message: string
): Promise<void> {
  await request(`/api/admin/customer-support/tickets/${encodeURIComponent(String(ticketId))}/reply`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export async function updateAdminSupportTicket(
  ticketId: number | string,
  patch: { status?: string; priority?: string; category?: string }
): Promise<void> {
  await request(`/api/admin/customer-support/tickets/${encodeURIComponent(String(ticketId))}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function createAdminTrackingEvent(body: {
  orderNumber: string;
  status: string;
  carrier?: string;
  trackingNumber?: string;
  location?: string;
  eventTime?: string;
}): Promise<void> {
  await request("/api/admin/customer-support/tracking-event", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchAdminSupportTemplates(): Promise<SupportTemplate[]> {
  return request<SupportTemplate[]>("/api/admin/customer-support/templates");
}

export async function queueAdminEmailNotification(body: {
  userId: number;
  subject: string;
  body: string;
  type?: string;
}): Promise<{ queued: boolean; providerConfigured: boolean }> {
  return request("/api/admin/customer-support/notifications/email", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
