import { getAdminToken } from "@/lib/admin/client";

export interface ControlledGoLiveDashboard {
  goLiveCount: number;
  blocked: number;
  reviewReady: number;
  active: number;
  rolledBack: number;
  createOrderCapability: "VALIDATED" | "UNVERIFIED" | "BLOCKED";
  liveValidation: "VALIDATED" | "UNVERIFIED" | "NONE";
  armingState: string;
  firstOrderState: string;
  firstOrderOutcome: "VALIDATED" | "FAILED" | "UNKNOWN" | "NOT_AVAILABLE";
  supplierConfirmation: "VALIDATED" | "UNVERIFIED" | "FAILED" | "NONE";
  tracking: "VALIDATED" | "UNVERIFIED" | "NONE";
  fctReconciliation: "PASS" | "FAIL" | "NOT_AVAILABLE";
  inventoryReconciliation: "PASS" | "FAIL" | "NOT_AVAILABLE";
  pricingReconciliation: "PASS" | "FAIL" | "NOT_AVAILABLE";
  financialReconciliation: "PASS" | "FAIL" | "NOT_AVAILABLE";
  security: "PASS" | "FAIL";
  risk: "PASS" | "FAIL";
  fourEyesApproval: "APPROVED" | "PENDING" | "BLOCKED";
  controlledGoLive: "ACTIVE" | "REVIEW_READY" | "BLOCKED";
  productionNetwork: "ON" | "OFF";
  realSupplierHttpCalls: number;
  realSupplierOrders: number;
  realCustomerOrders: number;
  marketplaceSideEffects: number;
  paymentSideEffects: number;
  carrierSideEffects: number;
  customerNotifications: number;
  blockers: string[];
}

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BUZZARD_API_URL || "").replace(/\/$/, "");
}

function authHeaders(): HeadersInit {
  const token = getAdminToken();
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiBase();
  if (!base) throw new Error("admin.apiUnavailable");
  const res = await fetch(`${base}${path}`, { ...init, headers: { ...authHeaders(), ...init?.headers } });
  const data = (await res.json()) as T & { success?: boolean; errorCode?: string };
  if (!res.ok) throw new Error(data.errorCode || "admin.requestFailed");
  return data;
}

export async function fetchControlledGoLiveDashboard() {
  return request<{ success: boolean; data: ControlledGoLiveDashboard }>(
    "/api/admin/supplier-controlled-go-live/dashboard",
  );
}

export async function requestGoLiveReview(body?: { executionId?: string; market?: string; channel?: string }) {
  return request<{ success: boolean; data: unknown }>("/api/admin/supplier-controlled-go-live/request-review", {
    method: "POST",
    body: JSON.stringify(body || {}),
  });
}

export async function approveControlledGoLive(body: {
  goLiveId: string;
  requesterId?: string;
  secondaryApproverId?: string;
}) {
  return request<{ success: boolean; data: unknown }>("/api/admin/supplier-controlled-go-live/approve", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function activateControlledGoLive(body: { goLiveId: string; approvalId?: string }) {
  return request<{ success: boolean; data: unknown }>("/api/admin/supplier-controlled-go-live/activate", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function rollbackControlledGoLive(body: { goLiveId: string; reason?: string }) {
  return request<{ success: boolean; data: unknown }>("/api/admin/supplier-controlled-go-live/rollback", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function pauseControlledGoLive(body: { goLiveId: string }) {
  return request<{ success: boolean; data: unknown }>("/api/admin/supplier-controlled-go-live/pause", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
