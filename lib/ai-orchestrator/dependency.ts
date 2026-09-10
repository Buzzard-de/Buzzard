import type { AiTask, DependencyStatus } from "./types";
import { getTask } from "./taskRegistry";

export function getDependencyStatus(task: AiTask): DependencyStatus {
  if (task.status === "CANCELLED") return "CANCELLED";
  if (task.status === "FAILED") return "FAILED";
  if (task.status === "RUNNING") return "RUNNING";
  if (task.status === "COMPLETED") return "COMPLETED";

  if (task.dependencies.length === 0) {
    return task.status === "BLOCKED" ? "BLOCKED" : "READY";
  }

  for (const depId of task.dependencies) {
    const dep = getTask(depId);
    if (!dep) return "BLOCKED";
    if (dep.status === "FAILED" || dep.status === "CANCELLED") return "BLOCKED";
    if (dep.status !== "COMPLETED") return "WAITING";
  }

  return "READY";
}

export function detectCircularDependency(
  taskId: string,
  dependencies: string[],
  visited: Set<string> = new Set(),
  stack: Set<string> = new Set()
): { circular: boolean; cycle?: string[] } {
  if (stack.has(taskId)) {
    return { circular: true, cycle: [...stack, taskId] };
  }
  if (visited.has(taskId)) {
    return { circular: false };
  }

  visited.add(taskId);
  stack.add(taskId);

  for (const depId of dependencies) {
    const dep = getTask(depId);
    const depDeps = dep?.dependencies ?? [];
    const result = detectCircularDependency(depId, depDeps, visited, stack);
    if (result.circular) return result;
  }

  stack.delete(taskId);
  return { circular: false };
}

export function validateDependencies(task: AiTask): { ok: boolean; errorCode?: string } {
  const cycle = detectCircularDependency(task.taskId, task.dependencies);
  if (cycle.circular) {
    return { ok: false, errorCode: "CIRCULAR_DEPENDENCY" };
  }
  for (const depId of task.dependencies) {
    if (!getTask(depId)) {
      return { ok: false, errorCode: "DEPENDENCY_NOT_FOUND" };
    }
  }
  return { ok: true };
}

export function areDependenciesSatisfied(task: AiTask): boolean {
  return getDependencyStatus(task) === "READY";
}
