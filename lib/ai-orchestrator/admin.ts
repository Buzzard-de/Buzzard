import type { AdminTaskRow, AiTask } from "./types";
import {
  getApproval,
  getApprovalsForTask,
  getConflict,
  getEscalation,
  getEscalationsForTask,
  getTask,
  getTasksByCorrelation,
  getWorkflowInstance,
  listAllTasks,
} from "./taskRegistry";
import { getWorker, listWorkers } from "./workerRegistry";
import { getAuditLog } from "./audit";
import { getOrchestratorEvents } from "./events";
import { getTaskApprovalStatus } from "./approval";
import { listOpenConflicts } from "./conflict";
import { getObservabilityMetrics } from "./observability";

export function listTasksAdmin(): AdminTaskRow[] {
  return listAllTasks().map((task) => ({
    taskId: task.taskId,
    taskType: task.taskType,
    workerId: task.workerId,
    status: task.status,
    priority: task.priority,
    entityType: task.entityType,
    entityId: task.entityId,
    correlationId: task.correlationId,
    createdAt: task.createdAt,
    escalationState: task.escalationState,
    approvalStatus: getTaskApprovalStatus(task.taskId),
  }));
}

export function inspectTask(taskId: string): {
  task?: AiTask;
  worker?: ReturnType<typeof getWorker>;
  approvals: ReturnType<typeof getApprovalsForTask>;
  escalations: ReturnType<typeof getEscalationsForTask>;
  events: ReturnType<typeof getOrchestratorEvents>;
  audit: ReturnType<typeof getAuditLog>;
} {
  const task = getTask(taskId);
  return {
    task,
    worker: task ? getWorker(task.workerId) : undefined,
    approvals: getApprovalsForTask(taskId),
    escalations: getEscalationsForTask(taskId),
    events: getOrchestratorEvents(taskId),
    audit: getAuditLog(taskId),
  };
}

export function inspectWorkflow(workflowInstanceId: string) {
  const instance = getWorkflowInstance(workflowInstanceId);
  if (!instance) return undefined;

  const tasks = instance.taskIds.map((id) => getTask(id)).filter(Boolean);
  return { instance, tasks };
}

export function inspectWorker(workerId: Parameters<typeof getWorker>[0]) {
  const worker = getWorker(workerId);
  if (!worker) return undefined;

  const tasks = listAllTasks().filter((t) => t.workerId === workerId);
  return { worker, tasks, capabilities: worker.capabilities };
}

export function inspectApproval(approvalId: string) {
  return getApproval(approvalId);
}

export function inspectEscalation(escalationId: string) {
  return getEscalation(escalationId);
}

export function inspectConflict(conflictId: string) {
  return getConflict(conflictId);
}

export function getAdminOverview() {
  return {
    tasks: listTasksAdmin(),
    workers: listWorkers(),
    metrics: getObservabilityMetrics(),
    openConflicts: listOpenConflicts(),
  };
}

export function getTasksByCorrelationAdmin(correlationId: string): AiTask[] {
  return getTasksByCorrelation(correlationId);
}
