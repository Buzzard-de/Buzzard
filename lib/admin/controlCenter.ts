import type {
  ActivityEvent,
  AiEmployee,
  AiTask,
  Approval,
  ControlCenterStatus,
  DashboardSummary,
  Integration,
} from "./controlCenterTypes";

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
  const data = (await res.json()) as T & { success?: boolean; errorKey?: string };
  if (!res.ok) throw new Error((data as { errorKey?: string }).errorKey || "admin.requestFailed");
  return data;
}

export async function fetchControlCenterStatus(): Promise<ControlCenterStatus> {
  const data = await request<{ success: boolean } & ControlCenterStatus>("/api/admin/control-center/status");
  return { generatedAt: data.generatedAt, services: data.services };
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const data = await request<{ success: boolean; summary: DashboardSummary }>("/api/admin/control-center/summary");
  return data.summary;
}

export async function fetchAiEmployees(): Promise<AiEmployee[]> {
  const data = await request<{ success: boolean; employees: AiEmployee[] }>("/api/admin/ai/employees");
  return data.employees;
}

export async function fetchAiTasks(status?: string): Promise<AiTask[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const data = await request<{ success: boolean; tasks: AiTask[] }>(`/api/admin/ai/tasks${qs}`);
  return data.tasks;
}

export async function createAiTask(body: {
  title: string;
  description?: string;
  employeeId?: string;
  priority?: string;
  permissionsRequired?: string[];
}): Promise<AiTask> {
  const data = await request<{ success: boolean; task: AiTask }>("/api/admin/ai/tasks", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return data.task;
}

export async function fetchApprovals(status = "PENDING"): Promise<Approval[]> {
  const data = await request<{ success: boolean; approvals: Approval[] }>(
    `/api/admin/approvals?status=${encodeURIComponent(status)}`
  );
  return data.approvals;
}

export async function decideApproval(id: string, decision: "approve" | "reject"): Promise<Approval> {
  const data = await request<{ success: boolean; approval: Approval }>(`/api/admin/approvals/${id}/decide`, {
    method: "POST",
    body: JSON.stringify({ decision }),
  });
  return data.approval;
}

export async function fetchIntegrations(refresh = false): Promise<Integration[]> {
  const data = await request<{ success: boolean; integrations: Integration[] }>(
    `/api/admin/control-center/integrations${refresh ? "?refresh=1" : ""}`
  );
  return data.integrations;
}

export async function fetchActivity(limit = 30): Promise<ActivityEvent[]> {
  const data = await request<{ success: boolean; activity: ActivityEvent[] }>(
    `/api/admin/control-center/activity?limit=${limit}`
  );
  return data.activity;
}

export async function fetchCategoryVisibility(): Promise<Record<string, { status: string; readiness?: Record<string, string> }>> {
  const data = await request<{ success: boolean; visibility: Record<string, { status: string }> }>(
    "/api/admin/categories/visibility"
  );
  return data.visibility;
}

export async function updateCategoryVisibility(
  categoryId: string,
  status: string
): Promise<void> {
  await request(`/api/admin/categories/${encodeURIComponent(categoryId)}/visibility`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function globalAdminSearch(q: string): Promise<Record<string, unknown>> {
  const data = await request<{ success: boolean; results: Record<string, unknown> }>(
    `/api/admin/control-center/search?q=${encodeURIComponent(q)}`
  );
  return data.results;
}
