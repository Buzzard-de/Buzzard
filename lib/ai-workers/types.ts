import type { AiTask, AuthorityLevel, TaskType, WorkerId } from "@/lib/ai-orchestrator/types";

export type { WorkerId, TaskType, AuthorityLevel } from "@/lib/ai-orchestrator/types";

export type ExecutionStatus =
  | "CREATED"
  | "VALIDATING"
  | "AUTHORIZED"
  | "CONTEXT_READY"
  | "RUNNING"
  | "OUTPUT_RECEIVED"
  | "VALIDATING_OUTPUT"
  | "DETERMINISTIC_VALIDATION"
  | "WAITING_APPROVAL"
  | "COMPLETED"
  | "REJECTED"
  | "FAILED"
  | "CANCELLED"
  | "TIMED_OUT"
  | "ESCALATED";

export type ContextClassification =
  | "PUBLIC"
  | "CUSTOMER_SAFE"
  | "INTERNAL"
  | "FINANCIAL"
  | "SENSITIVE"
  | "SECRET";

export type ActionCategory =
  | "OBSERVATION"
  | "RECOMMENDATION"
  | "LOW_RISK_ACTION"
  | "HIGH_RISK_ACTION"
  | "IRREVERSIBLE_ACTION";

export type ProviderHealthStatus = "HEALTHY" | "DEGRADED" | "UNHEALTHY" | "DISABLED";

export type WorkerPermission =
  | "READ_PRODUCT"
  | "READ_SUPPLIER"
  | "READ_PRICING"
  | "READ_INVENTORY"
  | "READ_ORDER"
  | "READ_MARKETPLACE"
  | "READ_RETURN"
  | "READ_FINANCIAL"
  | "CUSTOMER_SAFE_DATA"
  | "RECOMMEND_PRICE"
  | "RECOMMEND_SUPPLIER"
  | "RECOMMEND_REFUND"
  | "RECOMMEND_ORDER_ACTION"
  | "RECOMMEND_MARKETPLACE_ACTION";

export type ValidationStatus = "PENDING" | "PASSED" | "FAILED" | "NOT_REQUIRED";

export interface WorkerExecutionInput {
  task: AiTask;
  workerId: WorkerId;
  timeoutMs?: number;
}

export interface StructuredWorkerOutput {
  recommendation: unknown;
  confidence: number;
  proposedAction?: string;
  authorityRequired: AuthorityLevel;
  requiredApproval: boolean;
  deterministicValidationRequired: boolean;
  reasoningSummary: string;
  action?: ProposedAction;
}

export interface ProposedAction {
  actionType: string;
  entityType: string;
  entityId: string;
  parameters?: Record<string, unknown>;
  authorityRequired: AuthorityLevel;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  financialImpact?: number;
  reversible: boolean;
  requiresApproval: boolean;
  category: ActionCategory;
}

export interface DeterministicValidationResult {
  validationStatus: ValidationStatus;
  validationErrors: string[];
  finalDecision: "ALLOW" | "REJECT" | "APPROVAL" | "ESCALATE" | "PENDING";
  validatedBy: string;
  validatedAt: string;
}

export interface WorkerExecutionResult {
  ok: boolean;
  execution?: WorkerExecutionRecord;
  recommendation?: StructuredWorkerOutput;
  errorCode?: string;
  errorMessage?: string;
}

export interface WorkerExecutionRecord {
  executionId: string;
  taskId: string;
  workerId: WorkerId;
  workerVersion: string;
  taskType: TaskType;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  inputSchemaVersion: string;
  outputSchemaVersion: string;
  providerId: string;
  providerVersion: string;
  contextScope: string[];
  recommendation?: StructuredWorkerOutput;
  confidence?: number;
  proposedAction?: string;
  authorityRequired?: AuthorityLevel;
  deterministicValidation?: DeterministicValidationResult;
  validationStatus?: ValidationStatus;
  validationErrors?: string[];
  approvalRequired: boolean;
  escalationRequired: boolean;
  error?: string;
  correlationId: string;
  idempotencyKey?: string;
  deadlineAt?: string;
  cancelRequested?: boolean;
}

export interface WorkerContext {
  productId?: string;
  supplierId?: string;
  orderId?: string;
  returnId?: string;
  marketplaceId?: string;
  market?: string;
  channel?: string;
  customerId?: string;
  language?: string;
  engineOutputs?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface WorkerCapabilityProfile {
  workerId: WorkerId;
  capabilities: string[];
  supportedTaskTypes: TaskType[];
  supportedMarkets: string[];
  supportedLanguages: string[];
  supportedActions: ActionCategory[];
  requiredPermissions: WorkerPermission[];
  authorityLevel: AuthorityLevel;
  version: string;
}

export interface AiProviderDefinition {
  id: string;
  version: string;
  capabilities: string[];
  health: ProviderHealthStatus;
  enabled: boolean;
  supportedWorkers: WorkerId[];
  maxLatencyMs: number;
}

export interface ProviderExecuteInput {
  workerId: WorkerId;
  taskType: TaskType;
  context: WorkerContext;
  timeoutMs: number;
  metadata?: Record<string, unknown>;
}

export interface ProviderExecuteResult {
  ok: boolean;
  output?: StructuredWorkerOutput;
  errorCode?: string;
  errorMessage?: string;
  responseHash?: string;
}

export interface WorkerContract {
  workerId: WorkerId;
  canHandle(taskType: TaskType): boolean;
  validateInput(input: WorkerExecutionInput): { ok: boolean; errors: string[] };
  execute(context: WorkerContext, task: AiTask): StructuredWorkerOutput;
  validateOutput(output: StructuredWorkerOutput): { ok: boolean; errors: string[] };
  getCapabilities(): WorkerCapabilityProfile;
  getVersion(): string;
  getHealth(): ProviderHealthStatus;
}

export interface ProviderSelectionInput {
  workerId: WorkerId;
  taskType: TaskType;
  market?: string;
  language?: string;
  latencyRequirementMs?: number;
}

export interface EngineValidationInput {
  workerId: WorkerId;
  taskType: TaskType;
  output: StructuredWorkerOutput;
  context: WorkerContext;
}

export interface TelemetryMetrics {
  executionCount: number;
  successCount: number;
  failureCount: number;
  timeoutCount: number;
  validationRejectionCount: number;
  approvalWaitCount: number;
  averageDurationMs: number;
  providerUsage: Record<string, number>;
  workerUsage: Record<WorkerId, number>;
}

export interface WorkerAuditEntry {
  auditId: string;
  actor: string;
  workerId?: WorkerId;
  taskId?: string;
  executionId?: string;
  action: string;
  timestamp: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}
