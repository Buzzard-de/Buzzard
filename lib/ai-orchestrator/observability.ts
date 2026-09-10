import type { ObservabilityMetrics, WorkerId } from "./types";
import { listAllTasks } from "./taskRegistry";
import { listWorkers } from "./workerRegistry";
import { getTaskApprovalStatus } from "./approval";
import { getDependencyStatus } from "./dependency";

let tasksCreated = 0;
let tasksCompleted = 0;
let tasksFailed = 0;
let tasksRetried = 0;
let tasksEscalated = 0;
const executionTimes: number[] = [];
const workerExecutions = new Map<WorkerId, { success: number; failure: number }>();

export function incrementCreatedTasks(): void {
  tasksCreated += 1;
}

export function incrementCompletedTasks(): void {
  tasksCompleted += 1;
}

export function incrementFailedTasks(): void {
  tasksFailed += 1;
}

export function incrementRetriedTasks(): void {
  tasksRetried += 1;
}

export function incrementEscalatedTasks(): void {
  tasksEscalated += 1;
}

export function recordExecutionTime(ms: number): void {
  executionTimes.push(ms);
}

export function recordWorkerOutcome(workerId: WorkerId, success: boolean): void {
  const current = workerExecutions.get(workerId) ?? { success: 0, failure: 0 };
  if (success) current.success += 1;
  else current.failure += 1;
  workerExecutions.set(workerId, current);
}

export function getObservabilityMetrics(): ObservabilityMetrics {
  const workers = listWorkers();
  const workerHealth = {} as Record<WorkerId, ObservabilityMetrics["workerHealth"][WorkerId]>;
  const workerFailureRate = {} as Record<WorkerId, number>;

  for (const w of workers) {
    workerHealth[w.workerId] = w.healthStatus;
    const stats = workerExecutions.get(w.workerId);
    const total = (stats?.success ?? 0) + (stats?.failure ?? 0);
    workerFailureRate[w.workerId] = total > 0 ? (stats?.failure ?? 0) / total : 0;
  }

  const allTasks = listAllTasks();
  let approvalPendingCount = 0;
  let blockedTaskCount = 0;

  for (const task of allTasks) {
    if (getTaskApprovalStatus(task.taskId) === "PENDING") approvalPendingCount += 1;
    if (getDependencyStatus(task) === "WAITING" || task.status === "BLOCKED") blockedTaskCount += 1;
  }

  const averageExecutionTimeMs =
    executionTimes.length > 0
      ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length
      : 0;

  return {
    tasksCreated,
    tasksCompleted,
    tasksFailed,
    tasksRetried,
    tasksEscalated,
    averageExecutionTimeMs,
    workerHealth,
    workerFailureRate,
    approvalPendingCount,
    blockedTaskCount,
  };
}

export function resetObservabilityMetrics(): void {
  tasksCreated = 0;
  tasksCompleted = 0;
  tasksFailed = 0;
  tasksRetried = 0;
  tasksEscalated = 0;
  executionTimes.length = 0;
  workerExecutions.clear();
}
