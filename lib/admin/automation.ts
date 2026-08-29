import type { BackgroundJob, Schedule, WorkerState, IntegrationHealthRow } from "./automationTypes";

const TOKEN_KEY = "buzzard_admin_token";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BUZZARD_API_URL || "").replace(/\/$/, "");
}

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? sessionStorage.getItem(TOKEN_KEY) : null;
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
  const data = (await res.json()) as T & { success?: boolean; errorKey?: string; message?: string };
  if (!res.ok) throw new Error(data.errorKey || data.message || "admin.requestFailed");
  return data;
}

export async function fetchAutomationOverview(): Promise<{
  worker: WorkerState;
  jobCounts: Record<string, number>;
  schedules: number;
  integrations: IntegrationHealthRow[];
}> {
  const data = await request<{
    success: boolean;
    worker: WorkerState;
    jobCounts: Record<string, number>;
    schedules: number;
    integrations: IntegrationHealthRow[];
  }>("/api/admin/automation/overview");
  return {
    worker: data.worker,
    jobCounts: data.jobCounts,
    schedules: data.schedules,
    integrations: data.integrations,
  };
}

export async function fetchAutomationJobs(status?: string): Promise<BackgroundJob[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const data = await request<{ success: boolean; jobs: BackgroundJob[] }>(`/api/admin/automation/jobs${qs}`);
  return data.jobs;
}

export async function fetchSchedules(): Promise<Schedule[]> {
  const data = await request<{ success: boolean; schedules: Schedule[] }>("/api/admin/automation/schedules");
  return data.schedules;
}

export async function workerAction(action: "start" | "pause" | "resume" | "stop"): Promise<WorkerState> {
  const data = await request<{ success: boolean; worker: WorkerState }>(
    `/api/admin/automation/worker/${action}`,
    { method: "POST", body: "{}" }
  );
  return data.worker;
}

export async function retryJob(id: string): Promise<BackgroundJob> {
  const data = await request<{ success: boolean; job: BackgroundJob }>(
    `/api/admin/automation/jobs/${encodeURIComponent(id)}/retry`,
    { method: "POST", body: "{}" }
  );
  return data.job;
}

export async function cancelJob(id: string): Promise<BackgroundJob> {
  const data = await request<{ success: boolean; job: BackgroundJob }>(
    `/api/admin/automation/jobs/${encodeURIComponent(id)}/cancel`,
    { method: "POST", body: "{}" }
  );
  return data.job;
}

export async function enqueueSync(kind: "product" | "price" | "stock" | "supplier"): Promise<BackgroundJob> {
  const data = await request<{ success: boolean; job: BackgroundJob }>(
    `/api/admin/automation/sync/${kind}`,
    { method: "POST", body: JSON.stringify({ dryRun: true }) }
  );
  return data.job;
}

export async function fetchIntegrationHealth(refresh = false): Promise<IntegrationHealthRow[]> {
  const data = await request<{ success: boolean; health: IntegrationHealthRow[] }>(
    `/api/admin/automation/integrations/health${refresh ? "?refresh=1" : ""}`
  );
  return data.health;
}
