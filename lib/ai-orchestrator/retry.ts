import type { AiTask, FailureType } from "./types";
import { getTask, saveTask } from "./taskRegistry";
import { emitOrchestratorEvent } from "./events";
import { recordAudit } from "./audit";
import { enqueueTask } from "./taskQueue";

const RETRYABLE_FAILURES: Set<FailureType> = new Set([
  "TRANSIENT_FAILURE",
  "DEPENDENCY_FAILURE",
]);

const NON_RETRYABLE_FAILURES: Set<FailureType> = new Set([
  "PERMANENT_FAILURE",
  "VALIDATION_FAILURE",
  "AUTHORITY_FAILURE",
  "SECURITY_FAILURE",
]);

export function classifyFailure(errorCode: string): FailureType {
  if (errorCode === "AUTHORITY_VIOLATION" || errorCode === "WORKER_DISABLED") {
    return "AUTHORITY_FAILURE";
  }
  if (errorCode === "VALIDATION_FAILED" || errorCode === "DETERMINISTIC_VALIDATION_FAILED") {
    return "VALIDATION_FAILURE";
  }
  if (errorCode === "DEPENDENCY_NOT_SATISFIED" || errorCode === "CIRCULAR_DEPENDENCY") {
    return "DEPENDENCY_FAILURE";
  }
  if (errorCode === "SECURITY_VIOLATION" || errorCode === "CUSTOMER_ISOLATION") {
    return "SECURITY_FAILURE";
  }
  if (errorCode === "APPROVAL_REQUIRED") {
    return "HUMAN_APPROVAL_REQUIRED";
  }
  if (errorCode === "TRANSIENT_ERROR" || errorCode === "WORKER_TIMEOUT") {
    return "TRANSIENT_FAILURE";
  }
  return "PERMANENT_FAILURE";
}

export function isRetryable(failureType: FailureType): boolean {
  if (NON_RETRYABLE_FAILURES.has(failureType)) return false;
  return RETRYABLE_FAILURES.has(failureType);
}

export function failTask(
  taskId: string,
  errorCode: string,
  errorMessage?: string
): { ok: boolean; task?: AiTask; retryScheduled?: boolean } {
  const task = getTask(taskId);
  if (!task) return { ok: false };

  const failureType = classifyFailure(errorCode);
  task.status = "FAILED";
  task.failureReason = errorMessage ?? errorCode;
  task.failureType = failureType;
  task.lastError = errorMessage ?? errorCode;
  task.retryable = isRetryable(failureType);

  emitOrchestratorEvent({
    type: "TASK_FAILED",
    taskId,
    source: "retryEngine",
    correlationId: task.correlationId,
    metadata: { errorCode, failureType },
  });

  recordAudit({
    actor: "SYSTEM",
    actorType: "SYSTEM",
    taskId,
    workerId: task.workerId,
    action: "TASK_FAILED",
    previousState: "RUNNING",
    newState: "FAILED",
    correlationId: task.correlationId,
    reason: errorMessage ?? errorCode,
  });

  saveTask(task);

  if (task.retryable && task.retryCount < task.maxRetries) {
    return scheduleRetry(taskId);
  }

  return { ok: true, task, retryScheduled: false };
}

export function scheduleRetry(taskId: string): { ok: boolean; task?: AiTask; retryScheduled?: boolean } {
  const task = getTask(taskId);
  if (!task) return { ok: false };
  if (!task.retryable) return { ok: false, errorCode: "NOT_RETRYABLE" } as never;
  if (task.retryCount >= task.maxRetries) return { ok: false, errorCode: "MAX_RETRIES_EXCEEDED" } as never;

  task.retryCount += 1;
  task.status = "PENDING";
  task.nextAttemptAt = new Date(Date.now() + task.retryCount * 1000).toISOString();
  saveTask(task);

  enqueueTask(taskId, task.priority);

  emitOrchestratorEvent({
    type: "TASK_RETRIED",
    taskId,
    source: "retryEngine",
    correlationId: task.correlationId,
    metadata: { retryCount: task.retryCount },
  });

  recordAudit({
    actor: "SYSTEM",
    actorType: "SYSTEM",
    taskId,
    action: "TASK_RETRIED",
    newState: "PENDING",
    correlationId: task.correlationId,
    reason: `Retry ${task.retryCount}/${task.maxRetries}`,
  });

  return { ok: true, task, retryScheduled: true };
}

export function retryTask(taskId: string): { ok: boolean; task?: AiTask; errorCode?: string } {
  const task = getTask(taskId);
  if (!task) return { ok: false, errorCode: "TASK_NOT_FOUND" };
  if (!task.retryable && task.failureType && !isRetryable(task.failureType)) {
    return { ok: false, errorCode: "NOT_RETRYABLE" };
  }
  task.retryable = true;
  saveTask(task);
  const result = scheduleRetry(taskId);
  if (!result.ok) return { ok: false, errorCode: "RETRY_FAILED" };
  return { ok: true, task: result.task };
}
