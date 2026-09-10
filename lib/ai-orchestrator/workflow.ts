import type { CreateTaskInput, WorkflowDefinition, WorkflowInstance } from "./types";
import { createTask } from "./task";
import { executeTask } from "./execution";
import { cancelQueuedTask } from "./taskQueue";
import {
  generateCorrelationId,
  getTask,
  getWorkflowInstance,
  listWorkflowInstances,
  saveTask,
  saveWorkflowInstance,
} from "./taskRegistry";

const workflowDefinitions = new Map<string, WorkflowDefinition>();

export const ORDER_WORKFLOW: WorkflowDefinition = {
  workflowId: "WF_CUSTOMER_ORDER",
  name: "Customer Order Analysis Workflow",
  steps: [
    { stepIndex: 0, taskType: "SUPPLIER_SELECTION", workerId: "SUPPLIER_AI", dependsOnSteps: [] },
    { stepIndex: 1, taskType: "PRICE_RECOMMENDATION", workerId: "PRICING_AI", dependsOnSteps: [0] },
    { stepIndex: 2, taskType: "INVENTORY_ANALYSIS", workerId: "INVENTORY_AI", dependsOnSteps: [0] },
    { stepIndex: 3, taskType: "ORDER_ANALYSIS", workerId: "ORDER_AI", dependsOnSteps: [1, 2] },
    { stepIndex: 4, taskType: "MARKETPLACE_LISTING_ANALYSIS", workerId: "MARKETPLACE_AI", dependsOnSteps: [3] },
  ],
  createdAt: new Date().toISOString(),
};

export const RETURN_WORKFLOW: WorkflowDefinition = {
  workflowId: "WF_RETURN_REQUEST",
  name: "Return Request Analysis Workflow",
  steps: [
    { stepIndex: 0, taskType: "RETURN_ANALYSIS", workerId: "RETURNS_AI", dependsOnSteps: [] },
    { stepIndex: 1, taskType: "FINANCIAL_RECONCILIATION", workerId: "FINANCE_AI", dependsOnSteps: [0], requiresApproval: true },
  ],
  createdAt: new Date().toISOString(),
};

export function registerWorkflow(definition: WorkflowDefinition): void {
  workflowDefinitions.set(definition.workflowId, definition);
}

export function getWorkflowDefinition(workflowId: string): WorkflowDefinition | undefined {
  return workflowDefinitions.get(workflowId);
}

export function startWorkflow(input: {
  workflowId: string;
  entityType?: CreateTaskInput["entityType"];
  entityId?: string;
  context?: CreateTaskInput["context"];
  correlationId?: string;
}): { ok: boolean; instance?: WorkflowInstance; errorCode?: string } {
  const definition = workflowDefinitions.get(input.workflowId);
  if (!definition) return { ok: false, errorCode: "WORKFLOW_NOT_FOUND" };

  const correlationId = input.correlationId ?? generateCorrelationId();
  const instance: WorkflowInstance = {
    workflowInstanceId: `wfi_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    workflowId: input.workflowId,
    name: definition.name,
    status: "PENDING",
    taskIds: [],
    correlationId,
    createdAt: new Date().toISOString(),
  };

  const stepTaskMap = new Map<number, string>();

  for (const step of definition.steps) {
    const dependencies = step.dependsOnSteps
      .map((idx) => stepTaskMap.get(idx))
      .filter((id): id is string => Boolean(id));

    const result = createTask({
      taskType: step.taskType,
      workerId: step.workerId,
      entityType: input.entityType,
      entityId: input.entityId,
      context: input.context,
      dependencies,
      correlationId,
      workflowId: input.workflowId,
      workflowStep: step.stepIndex,
      source: "WORKFLOW",
    });

    if (!result.ok || !result.task) {
      return { ok: false, errorCode: result.errorCode ?? "TASK_CREATION_FAILED" };
    }

    stepTaskMap.set(step.stepIndex, result.task.taskId);
    instance.taskIds.push(result.task.taskId);
  }

  saveWorkflowInstance(instance);
  return { ok: true, instance };
}

export function executeWorkflowStep(workflowInstanceId: string, stepIndex: number): { ok: boolean; errorCode?: string } {
  const instance = getWorkflowInstance(workflowInstanceId);
  if (!instance) return { ok: false, errorCode: "WORKFLOW_NOT_FOUND" };

  const taskId = instance.taskIds[stepIndex];
  if (!taskId) return { ok: false, errorCode: "TASK_NOT_FOUND" };

  const result = executeTask(taskId);
  return { ok: result.ok, errorCode: result.errorCode };
}

export function executeReadyWorkflowSteps(workflowInstanceId: string): { executed: string[]; blocked: string[] } {
  const instance = getWorkflowInstance(workflowInstanceId);
  if (!instance) return { executed: [], blocked: [] };

  const executed: string[] = [];
  const blocked: string[] = [];

  for (const taskId of instance.taskIds) {
    const task = getTask(taskId);
    if (!task || task.status === "COMPLETED" || task.status === "CANCELLED") continue;

    const result = executeTask(taskId);
    if (result.ok && result.task?.status === "COMPLETED") {
      executed.push(taskId);
    } else if (result.errorCode === "DEPENDENCY_NOT_SATISFIED" || result.errorCode === "APPROVAL_REQUIRED") {
      blocked.push(taskId);
    }
  }

  const allCompleted = instance.taskIds.every((id) => getTask(id)?.status === "COMPLETED");
  if (allCompleted) {
    instance.status = "COMPLETED";
    instance.completedAt = new Date().toISOString();
    saveWorkflowInstance(instance);
  }

  return { executed, blocked };
}

export function cancelWorkflow(workflowInstanceId: string): boolean {
  const instance = getWorkflowInstance(workflowInstanceId);
  if (!instance) return false;

  for (const taskId of instance.taskIds) {
    const task = getTask(taskId);
    if (task && task.status !== "COMPLETED") {
      cancelQueuedTask(taskId);
      task.status = "CANCELLED";
      saveTask(task);
    }
  }

  instance.status = "CANCELLED";
  instance.completedAt = new Date().toISOString();
  saveWorkflowInstance(instance);
  return true;
}

export function listWorkflows(): WorkflowInstance[] {
  return listWorkflowInstances();
}

export function seedDefaultWorkflows(): void {
  registerWorkflow(ORDER_WORKFLOW);
  registerWorkflow(RETURN_WORKFLOW);
}
