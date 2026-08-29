export type ServiceStatus = "ONLINE" | "WARNING" | "OFFLINE" | "UNKNOWN";

export interface SystemServiceStatus {
  status: ServiceStatus;
  detail: string;
}

export interface ControlCenterStatus {
  generatedAt: string;
  services: Record<string, SystemServiceStatus>;
}

export interface AiEmployee {
  id: string;
  name: string;
  department: string;
  description: string;
  responsibility: string;
  permissions: string[];
  status: string;
  priority: number;
  capabilities: string[];
  assignedTasks: number;
  lastActivity: string | null;
  errors: string | null;
  performance: Record<string, unknown>;
}

export interface AiTask {
  id: string;
  title: string;
  description: string;
  employeeId: string | null;
  priority: string;
  status: string;
  permissionsRequired: string[];
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
}

export interface Approval {
  id: string;
  taskId: string | null;
  resourceType: string | null;
  resourceId: string | null;
  aiRecommendation: string;
  reason: string;
  riskLevel: string;
  status: string;
  decidedBy: string | null;
  createdAt: string;
}

export interface Integration {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
  lastCheckAt: string | null;
  lastError: string | null;
}

export interface ActivityEvent {
  id: string;
  eventType: string;
  summary: string;
  createdAt: string;
}

export interface DashboardSummary {
  aiEmployees: number;
  activeTasks: number;
  pendingApprovals: number;
  openEscalations: number;
  categoriesManaged: number;
}
