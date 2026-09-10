import type { EscalationRecord, EscalationSeverity, EscalationState, AiTask } from "./types";
import { getEscalation, saveEscalation, saveTask, getTask } from "./taskRegistry";
import { emitOrchestratorEvent } from "./events";
import { recordAudit } from "./audit";
import { incrementEscalatedTasks } from "./observability";

let escalationCounter = 0;

function generateEscalationId(): string {
  escalationCounter += 1;
  return `BZ-AI-ESC-${String(escalationCounter).padStart(6, "0")}`;
}

export function escalateTask(input: {
  taskId: string;
  reason: string;
  severity: EscalationSeverity;
  metadata?: Record<string, unknown>;
}): EscalationRecord | undefined {
  const task = getTask(input.taskId);
  if (!task) return undefined;

  const escalation: EscalationRecord = {
    escalationId: generateEscalationId(),
    taskId: input.taskId,
    reason: input.reason,
    severity: input.severity,
    state: "ESCALATED",
    metadata: input.metadata,
    createdAt: new Date().toISOString(),
  };

  saveEscalation(escalation);
  task.escalationState = "ESCALATED";
  saveTask(task);

  incrementEscalatedTasks();

  emitOrchestratorEvent({
    type: "TASK_ESCALATED",
    taskId: input.taskId,
    source: "escalationEngine",
    correlationId: task.correlationId,
    metadata: { escalationId: escalation.escalationId, severity: input.severity },
  });

  recordAudit({
    actor: "SYSTEM",
    actorType: "SYSTEM",
    taskId: input.taskId,
    action: "TASK_ESCALATED",
    newState: "ESCALATED",
    correlationId: task.correlationId,
    reason: input.reason,
  });

  return escalation;
}

export function acknowledgeEscalation(escalationId: string): boolean {
  const escalation = getEscalation(escalationId);
  if (!escalation) return false;

  escalation.state = "ACKNOWLEDGED";
  escalation.acknowledgedAt = new Date().toISOString();
  saveEscalation(escalation);

  const task = getTask(escalation.taskId);
  if (task) {
    task.escalationState = "ACKNOWLEDGED";
    saveTask(task);
  }
  return true;
}

export function resolveEscalation(escalationId: string): boolean {
  const escalation = getEscalation(escalationId);
  if (!escalation) return false;

  escalation.state = "RESOLVED";
  escalation.resolvedAt = new Date().toISOString();
  saveEscalation(escalation);

  const task = getTask(escalation.taskId);
  if (task) {
    task.escalationState = "RESOLVED";
    saveTask(task);
  }
  return true;
}

export function resetEscalationCounter(): void {
  escalationCounter = 0;
}
