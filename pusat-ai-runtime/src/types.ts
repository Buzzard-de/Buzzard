export type TaskStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | "TIMEOUT" | "BLOCKED";
export type ExceptionStatus = "OPEN" | "ASSIGNED" | "RESOLVED" | "REJECTED";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface VoiceSession {
  sessionId: string;
  correlationId: string;
  customerId?: string;
  orderId?: string;
  countryCode: string;
  locale: string;
  detectedLanguage: string;
  personaId: string;
  activeIntent?: string;
  status: "ACTIVE" | "ENDING" | "ENDED";
  context: Record<string, unknown>;
  pendingTaskIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SharedState {
  sessionId: string;
  version: number;
  data: Record<string, unknown>;
  updatedAt: string;
}

export interface TaskRequest<T = unknown> {
  taskId: string;
  correlationId: string;
  parentTaskId?: string;
  sourceAi: string;
  targetAi: string;
  action: string;
  payload: T;
  idempotencyKey: string;
  authorizationScope: string[];
  timeoutMs: number;
  retryCount: number;
}

export interface TaskResult<T = unknown> {
  taskId: string;
  correlationId: string;
  status: TaskStatus;
  result?: T;
  evidence?: unknown[];
  errorCode?: string;
  errorMessage?: string;
}

export interface ExceptionRecord {
  exceptionId: string;
  correlationId: string;
  sessionId: string;
  customerId?: string;
  orderId?: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  reason: string;
  requestedAction: string;
  requiredHumanAction: string;
  status: ExceptionStatus;
  createdAt: string;
  resolvedAt?: string;
}

export interface ApprovalRequest {
  approvalId: string;
  correlationId: string;
  sessionId: string;
  action: string;
  reason: string;
  status: ApprovalStatus;
  createdAt: string;
}

export interface AuditEvent {
  eventId: string;
  correlationId: string;
  sessionId?: string;
  actor: string;
  action: string;
  outcome: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

export interface PersonaConfig {
  personaId: string;
  countryCode: string;
  locale: string;
  language: string;
  displayName: string;
  voiceId: string;
  formality: number;
  empathy: number;
  speechRate: number;
  disclosureRequired: boolean;
}

export interface AiAgent {
  id: string;
  capabilities: string[];
  execute(request: TaskRequest): Promise<TaskResult>;
}