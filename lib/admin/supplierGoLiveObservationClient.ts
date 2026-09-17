import { getAdminToken } from "@/lib/admin/client";

export interface ObservationDashboard {
  observationCount: number;
  observationState: "ACTIVE" | "COMPLETED" | "BLOCKED" | "FAILED" | "REVIEW_READY";
  broaderRollout: "ACTIVE" | "REVIEW_READY" | "BLOCKED";
  controlledGoLive: "ACTIVE" | "BLOCKED" | "REVIEW_READY";
  createOrderCapability: "VALIDATED" | "UNVERIFIED" | "BLOCKED";
  liveValidation: "VALIDATED" | "UNVERIFIED" | "NONE";
  armingState: string;
  firstOrderState: string;
  observationDurationMs: number;
  observedOrders: number;
  successRate: number;
  failureRate: number;
  unknownOutcomes: number;
  supplierHealth: "PASS" | "FAIL" | "UNVERIFIED";
  inventoryQuality: "PASS" | "FAIL" | "UNVERIFIED";
  pricingQuality: "PASS" | "FAIL" | "UNVERIFIED";
  fulfillmentQuality: "PASS" | "FAIL" | "UNVERIFIED";
  financialQuality: "PASS" | "FAIL" | "UNVERIFIED";
  returns: "PASS" | "FAIL" | "NOT_AVAILABLE";
  customerImpact: "PASS" | "FAIL" | "NOT_AVAILABLE";
  security: "PASS" | "FAIL";
  criticalIncidents: number;
  observationReview: "READY" | "BLOCKED";
  fourEyesApproval: "APPROVED" | "PENDING" | "BLOCKED";
  rolloutScope: string;
  rolloutLimits: string;
  productionNetwork: "ON" | "OFF";
  realSupplierHttpCalls: number;
  realSupplierOrders: number;
  realCustomerOrders: number;
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

export async function fetchObservationDashboard() {
  return request<{ success: boolean; data: ObservationDashboard }>(
    "/api/admin/supplier-go-live-observation/dashboard",
  );
}

export async function startObservation(body?: { goLiveId?: string; market?: string; channel?: string }) {
  return request<{ success: boolean; data: unknown }>("/api/admin/supplier-go-live-observation/start", {
    method: "POST",
    body: JSON.stringify(body || {}),
  });
}
