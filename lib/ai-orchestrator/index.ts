export type {
  AiRecommendation,
  AiTask,
  AiWorker,
  ApprovalRequest,
  ApprovalStatus,
  AuditEntry,
  AuthorityLevel,
  ConflictRecord,
  ConflictResolutionMethod,
  CreateTaskInput,
  CreateTaskResult,
  DependencyStatus,
  DeterministicValidation,
  EntityType,
  EscalationRecord,
  EscalationSeverity,
  EscalationState,
  ExecuteTaskResult,
  FailureType,
  ObservabilityMetrics,
  OrchestratorEvent,
  OrchestratorEventType,
  PriorityInput,
  QueueEntry,
  RiskLevel,
  TaskContext,
  TaskPriority,
  TaskSource,
  TaskStatus,
  TaskType,
  WorkerExecuteResult,
  WorkerHealthStatus,
  WorkerId,
  WorkflowDefinition,
  WorkflowInstance,
  AdminTaskRow,
} from "./types";

export {
  TASK_TYPE_REGISTRY,
  DEFAULT_MAX_RETRIES,
  TASK_TYPE_TO_WORKER,
  TASK_TYPE_AUTHORITY,
  SENSITIVE_CONTEXT_KEYS,
  CUSTOMER_SAFE_CONTEXT_KEYS,
  SERVER_ONLY_TASK_FIELDS,
} from "./constants";

export {
  generateTaskId,
  generateCorrelationId,
  getTask,
  getTaskByIdempotencyKey,
  getTasksByCorrelation,
  listAllTasks,
  clearOrchestratorRegistry,
} from "./taskRegistry";

export {
  registerWorker,
  registerDefaultWorkers,
  getWorker,
  listWorkers,
  enableWorker,
  disableWorker,
  setWorkerHealth,
  findWorkerForTaskType,
  discoverWorkerCapabilities,
  clearWorkerRegistry,
} from "./workerRegistry";

export { createTask, cancelTask } from "./task";
export { calculateTaskPriority, comparePriority } from "./priority";
export {
  enqueueTask,
  dequeueTask,
  acknowledgeTask,
  completeQueuedTask,
  failQueuedTask,
  cancelQueuedTask,
  pauseQueue,
  resumeQueue,
  isQueuePaused,
  getQueueDepth,
  clearTaskQueue,
} from "./taskQueue";
export {
  getDependencyStatus,
  detectCircularDependency,
  validateDependencies,
  areDependenciesSatisfied,
} from "./dependency";
export {
  getRequiredAuthority,
  hasAuthority,
  validateWorkerAuthority,
  canExecuteRecommendation,
  validateDeterministicRule,
} from "./authority";
export {
  requiresApproval,
  createApprovalRequest,
  resolveApproval,
  getTaskApprovalStatus,
} from "./approval";
export { executeTask } from "./execution";
export { executeMockWorker, registerMockWorkerHandler } from "./worker";
export { failTask, scheduleRetry, retryTask, classifyFailure, isRetryable } from "./retry";
export { escalateTask, acknowledgeEscalation, resolveEscalation } from "./escalation";
export { detectConflict, resolveConflict, listOpenConflicts } from "./conflict";
export { buildWorkerContext, validateContextSafety, sanitizeAiOutput } from "./context";
export {
  rejectClientTaskModification,
  canCustomerAccessTask,
  validateWorkerAuthorization,
  sanitizeClientTaskPatch,
  containsSecrets,
  validateNoSecretsInContext,
} from "./security";
export {
  filterCustomerSafeContext,
  toCustomerSafeRecommendation,
  validateCustomerServiceTask,
} from "./customerSafety";
export {
  registerWorkflow,
  getWorkflowDefinition,
  startWorkflow,
  executeWorkflowStep,
  executeReadyWorkflowSteps,
  cancelWorkflow,
  listWorkflows,
  seedDefaultWorkflows,
  ORDER_WORKFLOW,
  RETURN_WORKFLOW,
} from "./workflow";
export { getWorkflowInstance } from "./taskRegistry";
export { emitOrchestratorEvent, getOrchestratorEvents, processWebhookEvent, clearOrchestratorEvents } from "./events";
export { recordAudit, getAuditLog, clearAuditLog } from "./audit";
export {
  getObservabilityMetrics,
  resetObservabilityMetrics,
  incrementCreatedTasks,
  incrementCompletedTasks,
  incrementFailedTasks,
} from "./observability";
export {
  listTasksAdmin,
  inspectTask,
  inspectWorkflow,
  inspectWorker,
  inspectApproval,
  inspectEscalation,
  inspectConflict,
  getAdminOverview,
  getTasksByCorrelationAdmin,
} from "./admin";
export {
  seedOrchestratorFixtures,
  buildTaskInput,
  buildOrderAnalysisInput,
  buildReturnAnalysisInput,
  buildCustomerServiceInput,
  buildFinanceAnalysisInput,
  FIXTURE_PRODUCT_TIRE,
  FIXTURE_SUPPLIER_A,
  FIXTURE_CUSTOMER_A,
  FIXTURE_CUSTOMER_B,
  FIXTURE_ORDER_A,
  FIXTURE_RETURN_A,
} from "./fixtures";
