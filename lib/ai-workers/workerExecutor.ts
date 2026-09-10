import type { AiRecommendation } from "@/lib/ai-orchestrator/types";
import type {
  ExecutionStatus,
  StructuredWorkerOutput,
  WorkerExecutionInput,
  WorkerExecutionRecord,
  WorkerExecutionResult,
} from "./types";
import {
  DEFAULT_EXECUTION_TIMEOUT_MS,
  INPUT_SCHEMA_VERSION,
  OUTPUT_SCHEMA_VERSION,
  VALID_EXECUTION_TRANSITIONS,
} from "./constants";
import {
  generateExecutionId,
  getExecution,
  getExecutionByIdempotency,
  isResponseHashProcessed,
  markResponseHashProcessed,
  saveExecution,
} from "./executionRegistry";
import { validateWorkerInput } from "./workerInput";
import { buildScopedWorkerContext, validateContextScope } from "./workerContext";
import { validateWorkerOutput } from "./workerOutput";
import { runDeterministicValidation } from "./validation";
import { getProvider, selectProvider } from "./providerRegistry";
import { getWorkerContract } from "./mockWorkers";
import { validateWorkerIdentity } from "./security";
import { computeDeadline, isTimedOut, applyTimeout } from "./timeout";
import { isActionSafe } from "./action";
import { recordWorkerAudit } from "./audit";
import {
  recordApprovalWait,
  recordExecutionFailure,
  recordExecutionStart,
  recordExecutionSuccess,
  recordExecutionTimeout,
  recordValidationRejection,
} from "./telemetry";

function transitionStatus(current: ExecutionStatus, next: ExecutionStatus): boolean {
  const allowed = VALID_EXECUTION_TRANSITIONS[current] ?? [];
  return allowed.includes(next);
}

function updateExecution(record: WorkerExecutionRecord, next: ExecutionStatus): WorkerExecutionRecord {
  if (!transitionStatus(record.status, next)) {
    return { ...record, status: "FAILED", error: `INVALID_TRANSITION:${record.status}->${next}` };
  }
  return { ...record, status: next };
}

export function executeWorker(input: WorkerExecutionInput): WorkerExecutionResult {
  const { task, workerId } = input;
  const timeoutMs = input.timeoutMs ?? DEFAULT_EXECUTION_TIMEOUT_MS;

  if (task.idempotencyKey) {
    const existing = getExecutionByIdempotency(task.taskId, task.idempotencyKey);
    if (existing && existing.status === "COMPLETED") {
      return { ok: true, execution: existing, recommendation: existing.recommendation };
    }
  }

  if (!validateWorkerIdentity(task.workerId, workerId)) {
    return { ok: false, errorCode: "WORKER_IMPERSONATION", errorMessage: "Worker ID mismatch" };
  }

  const startedAt = new Date().toISOString();
  let record: WorkerExecutionRecord = {
    executionId: generateExecutionId(),
    taskId: task.taskId,
    workerId,
    workerVersion: getWorkerContract(workerId)?.getVersion() ?? "unknown",
    taskType: task.taskType,
    status: "CREATED",
    startedAt,
    inputSchemaVersion: INPUT_SCHEMA_VERSION,
    outputSchemaVersion: OUTPUT_SCHEMA_VERSION,
    providerId: "",
    providerVersion: "",
    contextScope: [],
    approvalRequired: false,
    escalationRequired: false,
    correlationId: task.correlationId,
    idempotencyKey: task.idempotencyKey,
    deadlineAt: computeDeadline(startedAt, timeoutMs),
  };

  saveExecution(record);
  recordWorkerAudit({
    actor: "SYSTEM",
    workerId,
    taskId: task.taskId,
    executionId: record.executionId,
    action: "EXECUTION_CREATED",
    correlationId: task.correlationId,
  });

  record = updateExecution(record, "VALIDATING");
  saveExecution(record);

  const inputValidation = validateWorkerInput(input);
  if (!inputValidation.ok) {
    record = { ...updateExecution(record, "REJECTED"), error: inputValidation.errors.join(", "), completedAt: new Date().toISOString() };
    saveExecution(record);
    recordExecutionFailure();
    recordValidationRejection();
    recordWorkerAudit({
      actor: "SYSTEM",
      workerId,
      taskId: task.taskId,
      executionId: record.executionId,
      action: "INPUT_VALIDATION_FAILED",
      correlationId: task.correlationId,
      metadata: { errors: inputValidation.errors },
    });
    return { ok: false, execution: record, errorCode: "INPUT_VALIDATION_FAILED", errorMessage: inputValidation.errors.join(", ") };
  }

  record = updateExecution(record, "AUTHORIZED");
  saveExecution(record);

  const { context, scope } = buildScopedWorkerContext(task, workerId);
  const contextValidation = validateContextScope(workerId, context);
  if (!contextValidation.ok) {
    record = { ...updateExecution(record, "REJECTED"), error: contextValidation.errors.join(", "), completedAt: new Date().toISOString() };
    saveExecution(record);
    recordExecutionFailure();
    recordWorkerAudit({
      actor: "SYSTEM",
      workerId,
      taskId: task.taskId,
      executionId: record.executionId,
      action: "CONTEXT_VALIDATION_FAILED",
      correlationId: task.correlationId,
    });
    return { ok: false, execution: record, errorCode: "CONTEXT_VALIDATION_FAILED", errorMessage: contextValidation.errors.join(", ") };
  }

  record = { ...updateExecution(record, "CONTEXT_READY"), contextScope: scope };
  saveExecution(record);

  const providerSelection = selectProvider({
    workerId,
    taskType: task.taskType,
    market: task.market,
    language: task.language,
    latencyRequirementMs: timeoutMs,
  });

  if (!providerSelection.ok || !providerSelection.providerId) {
    record = { ...updateExecution(record, "FAILED"), error: providerSelection.errorCode, completedAt: new Date().toISOString() };
    saveExecution(record);
    recordExecutionFailure();
    return { ok: false, execution: record, errorCode: providerSelection.errorCode, errorMessage: "No provider available" };
  }

  const provider = getProvider(providerSelection.providerId)!;
  record = {
    ...updateExecution(record, "RUNNING"),
    providerId: provider.definition.id,
    providerVersion: provider.definition.version,
  };
  saveExecution(record);
  recordExecutionStart(workerId, provider.definition.id);

  recordWorkerAudit({
    actor: workerId,
    workerId,
    taskId: task.taskId,
    executionId: record.executionId,
    action: "EXECUTION_STARTED",
    correlationId: task.correlationId,
    metadata: { providerId: provider.definition.id },
  });

  if (record.cancelRequested) {
    record = { ...updateExecution(record, "CANCELLED"), completedAt: new Date().toISOString() };
    saveExecution(record);
    return { ok: false, execution: record, errorCode: "CANCELLED", errorMessage: "Execution cancelled" };
  }

  const resolvedResult = provider.execute({
    workerId,
    taskType: task.taskType,
    context,
    timeoutMs,
    metadata: task.context.metadata as Record<string, unknown> | undefined,
  });

  if (isTimedOut(record)) {
    record = applyTimeout(record);
    saveExecution(record);
    recordExecutionTimeout();
    recordWorkerAudit({
      actor: "SYSTEM",
      workerId,
      taskId: task.taskId,
      executionId: record.executionId,
      action: "EXECUTION_TIMED_OUT",
      correlationId: task.correlationId,
    });
    return { ok: false, execution: record, errorCode: "TIMED_OUT", errorMessage: "Execution timed out" };
  }

  if (!resolvedResult.ok || !resolvedResult.output) {
    record = {
      ...updateExecution(record, "FAILED"),
      error: resolvedResult.errorMessage ?? resolvedResult.errorCode,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - new Date(startedAt).getTime(),
    };
    saveExecution(record);
    recordExecutionFailure();
    return { ok: false, execution: record, errorCode: resolvedResult.errorCode ?? "PROVIDER_FAILED", errorMessage: resolvedResult.errorMessage };
  }

  if (resolvedResult.responseHash && isResponseHashProcessed(resolvedResult.responseHash)) {
    const existing = getExecutionByIdempotency(task.taskId, task.idempotencyKey ?? resolvedResult.responseHash);
    if (existing) {
      return { ok: true, execution: existing, recommendation: existing.recommendation };
    }
  }

  if (resolvedResult.responseHash) {
    markResponseHashProcessed(resolvedResult.responseHash, record.executionId);
  }

  record = updateExecution(record, "OUTPUT_RECEIVED");
  saveExecution(record);

  recordWorkerAudit({
    actor: provider.definition.id,
    workerId,
    taskId: task.taskId,
    executionId: record.executionId,
    action: "OUTPUT_RECEIVED",
    correlationId: task.correlationId,
  });

  record = updateExecution(record, "VALIDATING_OUTPUT");
  saveExecution(record);

  const worker = getWorkerContract(workerId)!;
  const workerOutputValidation = worker.validateOutput(resolvedResult.output);
  const schemaValidation = validateWorkerOutput(resolvedResult.output);
  const outputErrors = [...workerOutputValidation.errors, ...schemaValidation.errors];

  if (outputErrors.length > 0 || !isActionSafe(resolvedResult.output)) {
    record = {
      ...updateExecution(record, "REJECTED"),
      validationErrors: outputErrors,
      error: outputErrors.join(", "),
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - new Date(startedAt).getTime(),
    };
    saveExecution(record);
    recordExecutionFailure();
    recordValidationRejection();
    return { ok: false, execution: record, errorCode: "OUTPUT_VALIDATION_FAILED", errorMessage: outputErrors.join(", ") };
  }

  record = updateExecution(record, "DETERMINISTIC_VALIDATION");
  saveExecution(record);

  const deterministicResult = runDeterministicValidation({
    workerId,
    taskType: task.taskType,
    output: resolvedResult.output,
    context,
  });

  record = {
    ...record,
    recommendation: resolvedResult.output,
    confidence: resolvedResult.output.confidence,
    proposedAction: resolvedResult.output.proposedAction,
    authorityRequired: resolvedResult.output.authorityRequired,
    deterministicValidation: deterministicResult,
    validationStatus: deterministicResult.validationStatus,
    validationErrors: deterministicResult.validationErrors,
  };

  if (deterministicResult.validationStatus === "FAILED") {
    record = {
      ...updateExecution(record, deterministicResult.finalDecision === "ESCALATE" ? "ESCALATED" : "REJECTED"),
      escalationRequired: deterministicResult.finalDecision === "ESCALATE",
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - new Date(startedAt).getTime(),
    };
    saveExecution(record);
    recordExecutionFailure();
    recordValidationRejection();
    recordWorkerAudit({
      actor: "deterministicValidator",
      workerId,
      taskId: task.taskId,
      executionId: record.executionId,
      action: "DETERMINISTIC_VALIDATION_FAILED",
      correlationId: task.correlationId,
      metadata: { errors: deterministicResult.validationErrors },
    });
    return { ok: false, execution: record, errorCode: "DETERMINISTIC_VALIDATION_FAILED", errorMessage: deterministicResult.validationErrors.join(", ") };
  }

  recordWorkerAudit({
    actor: "deterministicValidator",
    workerId,
    taskId: task.taskId,
    executionId: record.executionId,
    action: "DETERMINISTIC_VALIDATION_PASSED",
    correlationId: task.correlationId,
  });

  if (deterministicResult.finalDecision === "APPROVAL" || resolvedResult.output.requiredApproval) {
    record = {
      ...updateExecution(record, "WAITING_APPROVAL"),
      approvalRequired: true,
    };
    saveExecution(record);
    recordApprovalWait();
    recordWorkerAudit({
      actor: "SYSTEM",
      workerId,
      taskId: task.taskId,
      executionId: record.executionId,
      action: "APPROVAL_REQUIRED",
      correlationId: task.correlationId,
    });
    return { ok: true, execution: record, recommendation: resolvedResult.output, errorCode: "APPROVAL_REQUIRED" };
  }

  record = {
    ...updateExecution(record, "COMPLETED"),
    completedAt: new Date().toISOString(),
    durationMs: Date.now() - new Date(startedAt).getTime(),
  };
  saveExecution(record);
  recordExecutionSuccess(record.durationMs ?? 0);

  recordWorkerAudit({
    actor: workerId,
    workerId,
    taskId: task.taskId,
    executionId: record.executionId,
    action: "EXECUTION_COMPLETED",
    correlationId: task.correlationId,
  });

  return { ok: true, execution: record, recommendation: resolvedResult.output };
}

export function cancelExecution(executionId: string): { ok: boolean; execution?: WorkerExecutionRecord; errorCode?: string } {
  const record = getExecution(executionId);
  if (!record) return { ok: false, errorCode: "EXECUTION_NOT_FOUND" };

  if (record.status === "COMPLETED" || record.status === "CANCELLED") {
    return { ok: false, errorCode: "ALREADY_TERMINAL" };
  }

  if (record.status === "RUNNING") {
    record.cancelRequested = true;
    saveExecution(record);
    return { ok: true, execution: record, errorCode: "CANCEL_REQUESTED" } as never;
  }

  const cancelled = { ...record, status: "CANCELLED" as ExecutionStatus, completedAt: new Date().toISOString() };
  saveExecution(cancelled);
  recordWorkerAudit({
    actor: "SYSTEM",
    executionId,
    action: "EXECUTION_CANCELLED",
    correlationId: record.correlationId,
  });
  return { ok: true, execution: cancelled };
}

export function toOrchestratorRecommendation(output: StructuredWorkerOutput): AiRecommendation {
  return {
    recommendation: output.recommendation,
    confidence: output.confidence,
    reasoningSummary: output.reasoningSummary,
    proposedAction: output.proposedAction,
    requiredApproval: output.requiredApproval,
    authorityRequired: output.authorityRequired,
    deterministicValidationRequired: output.deterministicValidationRequired,
  };
}
