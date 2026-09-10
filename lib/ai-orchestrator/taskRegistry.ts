import type { AiTask, ApprovalRequest, ConflictRecord, EscalationRecord, QueueEntry, WorkflowInstance } from "./types";

const tasks = new Map<string, AiTask>();
const idempotencyIndex = new Map<string, string>();
const correlationIndex = new Map<string, Set<string>>();
const queueEntries = new Map<string, QueueEntry>();
const approvals = new Map<string, ApprovalRequest>();
const escalations = new Map<string, EscalationRecord>();
const conflicts = new Map<string, ConflictRecord>();
const workflows = new Map<string, WorkflowInstance>();
const processedEvents = new Map<string, { processedAt: string }>();

let taskCounter = 0;

export function generateTaskId(): string {
  taskCounter += 1;
  const year = new Date().getFullYear();
  return `BZ-AI-TASK-${year}-${String(taskCounter).padStart(6, "0")}`;
}

export function generateCorrelationId(): string {
  return `corr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function saveTask(task: AiTask): void {
  tasks.set(task.taskId, task);
  if (task.idempotencyKey) {
    idempotencyIndex.set(task.idempotencyKey, task.taskId);
  }
  if (!correlationIndex.has(task.correlationId)) {
    correlationIndex.set(task.correlationId, new Set());
  }
  correlationIndex.get(task.correlationId)!.add(task.taskId);
}

export function getTask(taskId: string): AiTask | undefined {
  return tasks.get(taskId);
}

export function getTaskByIdempotencyKey(key: string): AiTask | undefined {
  const id = idempotencyIndex.get(key);
  return id ? tasks.get(id) : undefined;
}

export function getTasksByCorrelation(correlationId: string): AiTask[] {
  const ids = correlationIndex.get(correlationId);
  if (!ids) return [];
  return [...ids].map((id) => tasks.get(id)!).filter(Boolean);
}

export function listAllTasks(): AiTask[] {
  return [...tasks.values()];
}

export function saveQueueEntry(entry: QueueEntry): void {
  queueEntries.set(entry.queueEntryId, entry);
}

export function getQueueEntry(queueEntryId: string): QueueEntry | undefined {
  return queueEntries.get(queueEntryId);
}

export function listQueueEntries(): QueueEntry[] {
  return [...queueEntries.values()];
}

export function saveApproval(approval: ApprovalRequest): void {
  approvals.set(approval.approvalId, approval);
}

export function getApproval(approvalId: string): ApprovalRequest | undefined {
  return approvals.get(approvalId);
}

export function getApprovalsForTask(taskId: string): ApprovalRequest[] {
  return [...approvals.values()].filter((a) => a.taskId === taskId);
}

export function saveEscalation(escalation: EscalationRecord): void {
  escalations.set(escalation.escalationId, escalation);
}

export function getEscalation(escalationId: string): EscalationRecord | undefined {
  return escalations.get(escalationId);
}

export function getEscalationsForTask(taskId: string): EscalationRecord[] {
  return [...escalations.values()].filter((e) => e.taskId === taskId);
}

export function saveConflict(conflict: ConflictRecord): void {
  conflicts.set(conflict.conflictId, conflict);
}

export function getConflict(conflictId: string): ConflictRecord | undefined {
  return conflicts.get(conflictId);
}

export function listConflicts(): ConflictRecord[] {
  return [...conflicts.values()];
}

export function saveWorkflowInstance(instance: WorkflowInstance): void {
  workflows.set(instance.workflowInstanceId, instance);
}

export function getWorkflowInstance(workflowInstanceId: string): WorkflowInstance | undefined {
  return workflows.get(workflowInstanceId);
}

export function listWorkflowInstances(): WorkflowInstance[] {
  return [...workflows.values()];
}

export function markEventProcessed(eventId: string): void {
  processedEvents.set(eventId, { processedAt: new Date().toISOString() });
}

export function isEventProcessed(eventId: string): boolean {
  return processedEvents.has(eventId);
}

export function clearOrchestratorRegistry(): void {
  tasks.clear();
  idempotencyIndex.clear();
  correlationIndex.clear();
  queueEntries.clear();
  approvals.clear();
  escalations.clear();
  conflicts.clear();
  workflows.clear();
  processedEvents.clear();
  taskCounter = 0;
}
