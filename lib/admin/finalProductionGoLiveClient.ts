import { getAdminToken } from "@/lib/admin/client";

export interface FinalGoLiveDashboard {
  version: string;
  phase: string;
  salesEnabled: "CLOSED" | "OPEN";
  marketingSpendEnabled: "OFF" | "ON";
  liveStatus: string;
  blockers: string[];
  safetyCounters: Record<string, number>;
  mandatoryChecklist: Array<{ id: string; label: string; status: string }>;
}

export interface CompletionSectionReport {
  section: string;
  status: string;
  message: string;
  blockers: Array<{ code: string; severity: string; description: string }>;
}

export interface FinalProductionCompletionReport {
  generatedAt: string;
  software: string;
  sections: CompletionSectionReport[];
  blockers: Array<{ code: string; severity: string; description: string; resolution: string }>;
  sales: "OPEN" | "CLOSED";
  finalGoLive: "READY" | "BLOCKED";
  realSideEffects: Record<string, number>;
  fakeEvidenceCount: number;
  monitoring: { healthStatus: string };
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

async function adminFetch<T>(path: string): Promise<{ data: T }> {
  if (!getAdminToken()) throw new Error("admin.auth.required");
  const res = await fetch(`${apiBase()}${path}`, { headers: authHeaders() });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.errorCode || "REQUEST_FAILED");
  return json;
}

export function fetchFinalGoLiveDashboard() {
  return adminFetch<FinalGoLiveDashboard>("/api/admin/final-production-go-live/dashboard");
}

export function fetchFinalProductionCompletionReport() {
  return adminFetch<FinalProductionCompletionReport>("/api/admin/final-production-go-live/completion");
}

export function fetchFinalProductionStatusReport() {
  return adminFetch<Record<string, unknown>>("/api/admin/final-production-go-live/status-report");
}

export function fetchMissingProductionAccessReport() {
  return adminFetch<Record<string, unknown>>("/api/admin/final-production-go-live/missing-access");
}

export interface FinalClosureBlocker {
  code: string;
  provider?: string;
  severity: string;
  status: string;
  description: string;
  requiredAction: string;
}

export interface FinalClosureReport {
  generatedAt: string;
  finalState: string;
  finalGoLive: "READY" | "BLOCKED";
  finalDecision: "READY" | "BLOCKED";
  software: string;
  sections: Array<{ section: string; status: string; message: string }>;
  blockers: FinalClosureBlocker[];
  criticalBlockerCount: number;
  sales: "OPEN" | "CLOSED";
  fakeEvidenceCount: number;
  interCarsFlow: Array<{ stage: string; name: string; status: string; blockers: string[] }>;
}

export function fetchFinalClosureReport() {
  return adminFetch<FinalClosureReport>("/api/admin/final-production-go-live/closure");
}

export function fetchFinalGoLiveCheck() {
  return adminFetch<{ finalGoLive: string; finalState: string; criticalBlockers: number; blockers: string[] }>(
    "/api/admin/final-production-go-live/go-live-check",
  );
}
