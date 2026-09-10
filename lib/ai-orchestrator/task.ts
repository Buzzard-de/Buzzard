import type { AiTask, CreateTaskInput, CreateTaskResult } from "./types";
import { DEFAULT_MAX_RETRIES, TASK_TYPE_TO_WORKER } from "./constants";
import { calculateTaskPriority } from "./priority";
import { detectCircularDependency } from "./dependency";
import { validateWorkerAuthority } from "./authority";
import { validateNoSecretsInContext } from "./security";
import {
  generateCorrelationId,
  generateTaskId,
  getTask,
  getTaskByIdempotencyKey,
  saveTask,
} from "./taskRegistry";
import { cancelQueuedTask, enqueueTask } from "./taskQueue";
import { emitOrchestratorEvent } from "./events";
import { recordAudit } from "./audit";
import { incrementCreatedTasks } from "./observability";
import { findWorkerForTaskType, getWorker } from "./workerRegistry";

export function createTask(input: CreateTaskInput): CreateTaskResult {
  if (input.idempotencyKey) {
    const existing = getTaskByIdempotencyKey(input.idempotencyKey);
    if (existing) return { ok: true, task: existing };
  }

  const workerId = input.workerId ?? findWorkerForTaskType(input.taskType) ?? TASK_TYPE_TO_WORKER[input.taskType];
  const worker = getWorker(workerId);
  if (!worker) {
    return { ok: false, errorCode: "WORKER_NOT_FOUND", errorMessage: "No worker available for task type" };
  }

  if (input.context && !validateNoSecretsInContext(input.context as Record<string, unknown>)) {
    return { ok: false, errorCode: "SECURITY_VIOLATION", errorMessage: "Secrets detected in task context" };
  }

  const correlationId = input.correlationId ?? generateCorrelationId();
  const taskId = generateTaskId();

  const task: AiTask = {
    taskId,
    taskType: input.taskType,
    workerId,
    status: "PENDING",
    priority: input.priority ?? calculateTaskPriority(input.priorityInput),
    source: input.source ?? "SYSTEM",
    entityType: input.entityType ?? "NONE",
    entityId: input.entityId ?? "",
    market: input.market,
    channel: input.channel,
    language: input.language,
    context: input.context ?? {},
    dependencies: input.dependencies ?? [],
    requiredApprovals: [],
    authorityLevel: input.authorityLevel ?? worker.authorityLevel,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    maxRetries: input.maxRetries ?? DEFAULT_MAX_RETRIES,
    retryable: true,
    escalationState: "NONE",
    correlationId,
    idempotencyKey: input.idempotencyKey,
    workflowId: input.workflowId,
    workflowStep: input.workflowStep,
  };

  if (input.dependencies && input.dependencies.length > 0) {
    const cycle = detectCircularDependency(taskId, input.dependencies);
    if (cycle.circular) {
      return { ok: false, errorCode: "CIRCULAR_DEPENDENCY", errorMessage: "Circular dependency detected" };
    }
    task.status = "WAITING";
  }

  const authorityCheck = validateWorkerAuthority(task);
  if (!authorityCheck.ok) {
    return { ok: false, errorCode: authorityCheck.errorCode, errorMessage: "Worker authority insufficient" };
  }

  saveTask(task);
  enqueueTask(taskId, task.priority);
  incrementCreatedTasks();

  emitOrchestratorEvent({
    type: "TASK_CREATED",
    taskId,
    workerId,
    source: "taskManager",
    correlationId,
    metadata: { taskType: input.taskType },
  });

  recordAudit({
    actor: "SYSTEM",
    actorType: "SYSTEM",
    taskId,
    workerId,
    action: "TASK_CREATED",
    newState: "PENDING",
    correlationId,
  });

  return { ok: true, task };
}

export function cancelTask(taskId: string): { ok: boolean; task?: AiTask; errorCode?: string } {
  const task = getTask(taskId);
  if (!task) return { ok: false, errorCode: "TASK_NOT_FOUND" };
  if (task.status === "COMPLETED") return { ok: false, errorCode: "ALREADY_COMPLETED" };

  cancelQueuedTask(taskId);
  task.status = "CANCELLED";
  saveTask(task);

  emitOrchestratorEvent({
    type: "TASK_CANCELLED",
    taskId,
    source: "taskManager",
    correlationId: task.correlationId,
  });

  return { ok: true, task };
}
