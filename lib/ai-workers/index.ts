export type {
  ActionCategory,
  AiProviderDefinition,
  ContextClassification,
  DeterministicValidationResult,
  EngineValidationInput,
  ExecutionStatus,
  ProposedAction,
  ProviderExecuteInput,
  ProviderExecuteResult,
  ProviderHealthStatus,
  ProviderSelectionInput,
  StructuredWorkerOutput,
  TelemetryMetrics,
  WorkerAuditEntry,
  WorkerCapabilityProfile,
  WorkerContext,
  WorkerContract,
  WorkerExecutionInput,
  WorkerExecutionRecord,
  WorkerExecutionResult,
  WorkerPermission,
} from "./types";

export {
  INPUT_SCHEMA_VERSION,
  OUTPUT_SCHEMA_VERSION,
  DEFAULT_EXECUTION_TIMEOUT_MS,
  MOCK_PROVIDER_ID,
  CONTEXT_FIELD_CLASSIFICATION,
  WORKER_PERMISSIONS,
  WORKER_SUPPORTED_TASKS,
  FORBIDDEN_WORKER_ACTIONS,
} from "./constants";

export {
  generateExecutionId,
  getExecution,
  getExecutionByIdempotency,
  listExecutions,
  clearExecutionRegistry,
} from "./executionRegistry";

export type { AiProvider } from "./provider";

export {
  registerProvider,
  registerDefaultProviders,
  getProvider,
  listProviders,
  enableProvider,
  disableProvider,
  setProviderHealth,
  selectProvider,
  clearProviderRegistry,
} from "./providerRegistry";

export {
  getWorkerPermissions,
  hasPermission,
  canAccessContextField,
  validateContextPermissions,
} from "./permissions";

export {
  getWorkerCapabilityProfile,
  discoverAllCapabilities,
} from "./capabilities";

export { buildScopedWorkerContext, validateContextScope } from "./workerContext";
export { validateWorkerInput, validateWorkerCompatibility } from "./workerInput";
export { validateWorkerOutput } from "./workerOutput";
export { buildProposedAction, categorizeAction, isActionSafe } from "./action";
export { runDeterministicValidation, validateEngineAdapter } from "./validation";
export { getWorkerHealth, getProviderHealth, isWorkerHealthy, isProviderAvailable, getSystemHealthSummary } from "./health";
export { computeDeadline, isTimedOut, applyTimeout } from "./timeout";
export { getTelemetryMetrics, resetTelemetry, recordExecutionStart } from "./telemetry";
export { recordWorkerAudit, getWorkerAuditLog, clearWorkerAuditLog } from "./audit";
export {
  validateNoSecretsInContext,
  rejectClientExecutionModification,
  validateWorkerIdentity,
  validateProviderIdentity,
  canAccessEntity,
} from "./security";

export {
  executeWorker,
  cancelExecution,
  toOrchestratorRecommendation,
} from "./workerExecutor";

export {
  getWorkerContract,
  listWorkerContracts,
  resetMockWorkers,
} from "./mockWorkers";

export {
  seedAiWorkersFixtures,
  buildFixtureTask,
  FIXTURE_PRODUCT,
  FIXTURE_SUPPLIER,
  FIXTURE_ORDER,
  FIXTURE_RETURN,
  FIXTURE_CUSTOMER,
  FIXTURE_MARKET,
} from "./fixtures";
