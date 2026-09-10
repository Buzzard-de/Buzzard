import type { AiTask, ExecuteTaskResult } from "./types";
import { validateWorkerAuthority, validateDeterministicRule } from "./authority";
import { areDependenciesSatisfied } from "./dependency";
import { buildWorkerContext, validateContextSafety } from "./context";
import { validateCustomerServiceTask } from "./customerSafety";
import { createApprovalRequest, getTaskApprovalStatus, requiresApproval } from "./approval";
import { executeMockWorker } from "./worker";
import { failTask } from "./retry";
import { escalateTask } from "./escalation";
import { completeQueuedTask, failQueuedTask } from "./taskQueue";
import { getTask, saveTask } from "./taskRegistry";
import { emitOrchestratorEvent } from "./events";
import { recordAudit } from "./audit";
import {
  incrementCompletedTasks,
  incrementFailedTasks,
  recordExecutionTime,
} from "./observability";

export function executeTask(taskId: string): ExecuteTaskResult {
  const task = getTask(taskId);
  if (!task) return { ok: false, errorCode: "TASK_NOT_FOUND", errorMessage: "Task not found" };

  if (task.status === "COMPLETED" || task.status === "CANCELLED") {
    return { ok: false, errorCode: "TASK_NOT_EXECUTABLE", errorMessage: `Task is ${task.status}` };
  }

  if (!areDependenciesSatisfied(task)) {
    task.status = "WAITING";
    saveTask(task);
    return { ok: false, errorCode: "DEPENDENCY_NOT_SATISFIED", errorMessage: "Dependencies not satisfied" };
  }

  const authorityCheck = validateWorkerAuthority(task);
  if (!authorityCheck.ok) {
    failTask(taskId, authorityCheck.errorCode!, "Authority validation failed");
    return { ok: false, errorCode: authorityCheck.errorCode, errorMessage: "Authority violation" };
  }

  const contextCheck = validateContextSafety(buildWorkerContext(task));
  if (!contextCheck.ok) {
    failTask(taskId, "SECURITY_VIOLATION", contextCheck.violations.join(", "));
    return { ok: false, errorCode: "SECURITY_VIOLATION", errorMessage: "Sensitive data in context" };
  }

  const customerCheck = validateCustomerServiceTask(task);
  if (!customerCheck.ok) {
    failTask(taskId, "SECURITY_VIOLATION", "Internal data exposed to customer service context");
    return { ok: false, errorCode: customerCheck.errorCode, errorMessage: "Customer safety violation" };
  }

  const approvalStatus = getTaskApprovalStatus(taskId);
  if (approvalStatus === "PENDING") {
    return { ok: false, errorCode: "APPROVAL_REQUIRED", errorMessage: "Human approval pending" };
  }
  if (approvalStatus === "REJECTED") {
    failTask(taskId, "APPROVAL_REJECTED", "Approval was rejected");
    return { ok: false, errorCode: "APPROVAL_REJECTED", errorMessage: "Approval rejected" };
  }

  const startTime = Date.now();
  task.status = "RUNNING";
  task.startedAt = new Date().toISOString();
  saveTask(task);

  emitOrchestratorEvent({
    type: "TASK_STARTED",
    taskId,
    workerId: task.workerId,
    source: "executionManager",
    correlationId: task.correlationId,
  });

  recordAudit({
    actor: task.workerId,
    actorType: "WORKER",
    taskId,
    workerId: task.workerId,
    action: "TASK_STARTED",
    previousState: "READY",
    newState: "RUNNING",
    correlationId: task.correlationId,
  });

  const workerResult = executeMockWorker(task);
  if (!workerResult.ok || !workerResult.recommendation) {
    const failResult = failTask(taskId, workerResult.errorCode ?? "WORKER_FAILED", workerResult.errorMessage);
    failQueuedTask(taskId);
    incrementFailedTasks();
    return { ok: false, errorCode: workerResult.errorCode, errorMessage: workerResult.errorMessage, task: failResult.task };
  }

  const recommendation = workerResult.recommendation;
  task.recommendation = recommendation;
  task.result = recommendation;

  const validation = validateDeterministicRule(task, recommendation);
  task.deterministicValidation = {
    aiRecommendation: recommendation.recommendation,
    validationStatus: validation.validationStatus,
    validationErrors: validation.validationErrors,
    finalDecision: validation.finalDecision,
    validatedAt: new Date().toISOString(),
    validatedBy: "deterministicValidator",
  };

  if (validation.validationStatus === "FAILED") {
    emitOrchestratorEvent({
      type: "DETERMINISTIC_VALIDATION_FAILED",
      taskId,
      source: "executionManager",
      correlationId: task.correlationId,
      metadata: { errors: validation.validationErrors },
    });
    failTask(taskId, "DETERMINISTIC_VALIDATION_FAILED", validation.validationErrors.join(", "));
    failQueuedTask(taskId);
    incrementFailedTasks();

    if (validation.validationErrors.some((e) => e.includes("HISTORICAL"))) {
      escalateTask({
        taskId,
        reason: "Attempt to overwrite authoritative financial data",
        severity: "HIGH",
      });
    }

    return { ok: false, errorCode: "DETERMINISTIC_VALIDATION_FAILED", errorMessage: validation.validationErrors.join(", "), task: getTask(taskId) };
  }

  emitOrchestratorEvent({
    type: "DETERMINISTIC_VALIDATION_PASSED",
    taskId,
    source: "executionManager",
    correlationId: task.correlationId,
  });

  if (validation.finalDecision === "PENDING" || requiresApproval(task, task.context.metadata?.financialImpact as number | undefined)) {
    createApprovalRequest({
      taskId,
      requestedAction: recommendation.proposedAction ?? task.taskType,
      reason: recommendation.reasoningSummary,
      riskLevel: (task.context.metadata?.riskLevel as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL") ?? "MEDIUM",
      financialImpact: task.context.metadata?.financialImpact as number | undefined,
      requestedBy: task.workerId,
    });
    task.status = "BLOCKED";
    saveTask(task);
    return { ok: true, task, errorCode: "APPROVAL_REQUIRED" } as ExecuteTaskResult;
  }

  task.status = "COMPLETED";
  task.completedAt = new Date().toISOString();
  saveTask(task);
  completeQueuedTask(taskId);

  const executionTime = Date.now() - startTime;
  recordExecutionTime(executionTime);
  incrementCompletedTasks();

  emitOrchestratorEvent({
    type: "TASK_COMPLETED",
    taskId,
    workerId: task.workerId,
    source: "executionManager",
    correlationId: task.correlationId,
    metadata: { executionTimeMs: executionTime },
  });

  recordAudit({
    actor: task.workerId,
    actorType: "WORKER",
    taskId,
    workerId: task.workerId,
    action: "TASK_COMPLETED",
    previousState: "RUNNING",
    newState: "COMPLETED",
    correlationId: task.correlationId,
  });

  return { ok: true, task: getTask(taskId) };
}
