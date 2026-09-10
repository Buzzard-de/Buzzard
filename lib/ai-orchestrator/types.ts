export type TaskPriority = "CRITICAL" | "HIGH" | "NORMAL" | "LOW" | "BACKGROUND";

export type TaskStatus =
  | "PENDING"
  | "QUEUED"
  | "WAITING"
  | "READY"
  | "BLOCKED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "PAUSED";

export type TaskType =
  | "PRODUCT_ANALYSIS"
  | "PRODUCT_TRANSLATION"
  | "SUPPLIER_SELECTION"
  | "SUPPLIER_HEALTH_ANALYSIS"
  | "PRICE_RECOMMENDATION"
  | "INVENTORY_ANALYSIS"
  | "ORDER_ANALYSIS"
  | "MARKETPLACE_LISTING_ANALYSIS"
  | "CUSTOMS_ANALYSIS"
  | "CUSTOMER_SERVICE"
  | "RETURN_ANALYSIS"
  | "FINANCIAL_RECONCILIATION"
  | "ANOMALY_DETECTION"
  | "EXCEPTION_REVIEW"
  | "HUMAN_APPROVAL_REQUIRED";

export type WorkerId =
  | "PRODUCT_AI"
  | "SUPPLIER_AI"
  | "PRICING_AI"
  | "INVENTORY_AI"
  | "ORDER_AI"
  | "MARKETPLACE_AI"
  | "CUSTOMS_AI"
  | "CUSTOMER_SERVICE_AI"
  | "RETURNS_AI"
  | "FINANCE_AI";

export type AuthorityLevel =
  | "OBSERVE"
  | "ANALYZE"
  | "RECOMMEND"
  | "EXECUTE_LOW_RISK"
  | "EXECUTE_WITH_APPROVAL"
  | "NEVER_EXECUTE";

export type WorkerHealthStatus = "HEALTHY" | "DEGRADED" | "UNHEALTHY" | "DISABLED";

export type ApprovalStatus =
  | "NOT_REQUIRED"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED";

export type FailureType =
  | "TRANSIENT_FAILURE"
  | "PERMANENT_FAILURE"
  | "VALIDATION_FAILURE"
  | "AUTHORITY_FAILURE"
  | "DEPENDENCY_FAILURE"
  | "HUMAN_APPROVAL_REQUIRED"
  | "SECURITY_FAILURE";

export type EscalationState = "NONE" | "PENDING" | "ESCALATED" | "ACKNOWLEDGED" | "RESOLVED";

export type EscalationSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type DependencyStatus =
  | "WAITING"
  | "READY"
  | "BLOCKED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type ValidationStatus = "PENDING" | "PASSED" | "FAILED" | "NOT_REQUIRED";

export type ConflictResolutionStatus = "OPEN" | "RESOLVED" | "ESCALATED";

export type ConflictResolutionMethod =
  | "DETERMINISTIC_RULE"
  | "PRIORITY_RULE"
  | "HUMAN_APPROVAL"
  | "ESCALATION";

export type TaskSource =
  | "SYSTEM"
  | "ADMIN"
  | "WORKFLOW"
  | "WEBHOOK"
  | "SCHEDULED"
  | "MANUAL";

export type EntityType =
  | "PRODUCT"
  | "SUPPLIER"
  | "ORDER"
  | "RETURN"
  | "MARKETPLACE_LISTING"
  | "INVENTORY"
  | "CUSTOMER"
  | "WORKFLOW"
  | "NONE";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type OrchestratorEventType =
  | "TASK_CREATED"
  | "TASK_QUEUED"
  | "TASK_STARTED"
  | "TASK_COMPLETED"
  | "TASK_FAILED"
  | "TASK_RETRIED"
  | "TASK_CANCELLED"
  | "TASK_BLOCKED"
  | "TASK_ESCALATED"
  | "WORKER_REGISTERED"
  | "WORKER_ENABLED"
  | "WORKER_DISABLED"
  | "WORKER_HEALTH_CHANGED"
  | "APPROVAL_REQUESTED"
  | "APPROVAL_APPROVED"
  | "APPROVAL_REJECTED"
  | "CONFLICT_DETECTED"
  | "CONFLICT_RESOLVED"
  | "DETERMINISTIC_VALIDATION_PASSED"
  | "DETERMINISTIC_VALIDATION_FAILED";

export interface AiRecommendation {
  recommendation: unknown;
  confidence: number;
  reasoningSummary: string;
  proposedAction?: string;
  requiredApproval: boolean;
  authorityRequired: AuthorityLevel;
  deterministicValidationRequired: boolean;
}

export interface DeterministicValidation {
  aiRecommendation: unknown;
  validationStatus: ValidationStatus;
  validationErrors: string[];
  finalDecision: "ALLOW" | "REJECT" | "ESCALATE" | "PENDING";
  validatedAt?: string;
  validatedBy?: string;
}

export interface TaskContext {
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

export interface AiTask {
  taskId: string;
  taskType: TaskType;
  workerId: WorkerId;
  status: TaskStatus;
  priority: TaskPriority;
  source: TaskSource;
  entityType: EntityType;
  entityId: string;
  market?: string;
  channel?: string;
  language?: string;
  context: TaskContext;
  dependencies: string[];
  requiredApprovals: string[];
  authorityLevel: AuthorityLevel;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  retryCount: number;
  maxRetries: number;
  failureReason?: string;
  failureType?: FailureType;
  lastError?: string;
  nextAttemptAt?: string;
  retryable: boolean;
  escalationState: EscalationState;
  result?: AiRecommendation;
  recommendation?: AiRecommendation;
  deterministicValidation?: DeterministicValidation;
  correlationId: string;
  idempotencyKey?: string;
  workflowId?: string;
  workflowStep?: number;
}

export interface AiWorker {
  workerId: WorkerId;
  name: string;
  version: string;
  capabilities: string[];
  supportedTaskTypes: TaskType[];
  authorityLevel: AuthorityLevel;
  enabled: boolean;
  healthStatus: WorkerHealthStatus;
  maxConcurrency: number;
  requiredPermissions: string[];
  registeredAt: string;
}

export interface WorkflowDefinition {
  workflowId: string;
  name: string;
  steps: WorkflowStep[];
  createdAt: string;
}

export interface WorkflowStep {
  stepIndex: number;
  taskType: TaskType;
  workerId: WorkerId;
  dependsOnSteps: number[];
  requiresApproval?: boolean;
  condition?: "ALWAYS" | "ON_SUCCESS" | "ON_FAILURE";
}

export interface WorkflowInstance {
  workflowInstanceId: string;
  workflowId: string;
  name: string;
  status: TaskStatus;
  taskIds: string[];
  correlationId: string;
  createdAt: string;
  completedAt?: string;
}

export interface ApprovalRequest {
  approvalId: string;
  taskId: string;
  requestedAction: string;
  reason: string;
  riskLevel: RiskLevel;
  financialImpact?: number;
  currency?: string;
  requestedBy: string;
  approvedBy?: string;
  status: ApprovalStatus;
  createdAt: string;
  resolvedAt?: string;
}

export interface EscalationRecord {
  escalationId: string;
  taskId: string;
  reason: string;
  severity: EscalationSeverity;
  state: EscalationState;
  metadata?: Record<string, unknown>;
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}

export interface ConflictRecord {
  conflictId: string;
  taskId: string;
  workers: WorkerId[];
  recommendations: Array<{ workerId: WorkerId; recommendation: unknown }>;
  conflictType: string;
  severity: EscalationSeverity;
  resolutionStatus: ConflictResolutionStatus;
  resolutionMethod?: ConflictResolutionMethod;
  resolvedBy?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface OrchestratorEvent {
  eventId: string;
  taskId?: string;
  workerId?: WorkerId;
  type: OrchestratorEventType;
  timestamp: string;
  source: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditEntry {
  auditId: string;
  actor: string;
  actorType: "SYSTEM" | "ADMIN" | "WORKER" | "CUSTOMER";
  taskId?: string;
  workerId?: WorkerId;
  action: string;
  previousState?: string;
  newState?: string;
  timestamp: string;
  correlationId?: string;
  reason?: string;
}

export interface QueueEntry {
  queueEntryId: string;
  taskId: string;
  priority: TaskPriority;
  enqueuedAt: string;
  acknowledgedAt?: string;
  status: "PENDING" | "ACKNOWLEDGED" | "COMPLETED" | "FAILED" | "CANCELLED";
}

export interface PriorityInput {
  customerImpact?: number;
  financialImpact?: number;
  orderUrgency?: number;
  inventoryRisk?: number;
  supplierFailure?: boolean;
  marketplaceSla?: boolean;
  returnRefundUrgency?: boolean;
  complianceRisk?: boolean;
  dependencyBlocking?: boolean;
  systemHealth?: WorkerHealthStatus;
}

export interface ObservabilityMetrics {
  tasksCreated: number;
  tasksCompleted: number;
  tasksFailed: number;
  tasksRetried: number;
  tasksEscalated: number;
  averageExecutionTimeMs: number;
  workerHealth: Record<WorkerId, WorkerHealthStatus>;
  workerFailureRate: Record<WorkerId, number>;
  approvalPendingCount: number;
  blockedTaskCount: number;
}

export interface CreateTaskInput {
  taskType: TaskType;
  workerId: WorkerId;
  source?: TaskSource;
  entityType?: EntityType;
  entityId?: string;
  market?: string;
  channel?: string;
  language?: string;
  context?: TaskContext;
  dependencies?: string[];
  priority?: TaskPriority;
  priorityInput?: PriorityInput;
  authorityLevel?: AuthorityLevel;
  maxRetries?: number;
  correlationId?: string;
  idempotencyKey?: string;
  workflowId?: string;
  workflowStep?: number;
}

export interface CreateTaskResult {
  ok: boolean;
  task?: AiTask;
  errorCode?: string;
  errorMessage?: string;
}

export interface ExecuteTaskResult {
  ok: boolean;
  task?: AiTask;
  errorCode?: string;
  errorMessage?: string;
}

export interface WorkerExecuteInput {
  task: AiTask;
  context: TaskContext;
}

export interface WorkerExecuteResult {
  ok: boolean;
  recommendation?: AiRecommendation;
  errorCode?: string;
  errorMessage?: string;
}

export interface AdminTaskRow {
  taskId: string;
  taskType: TaskType;
  workerId: WorkerId;
  status: TaskStatus;
  priority: TaskPriority;
  entityType: EntityType;
  entityId: string;
  correlationId: string;
  createdAt: string;
  escalationState: EscalationState;
  approvalStatus?: ApprovalStatus;
}
