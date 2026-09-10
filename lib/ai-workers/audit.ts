import type { WorkerAuditEntry, WorkerId } from "./types";

const auditLog: WorkerAuditEntry[] = [];

const SECRET_PATTERN = /api[_-]?key|secret|password|token|authorization|bearer|credential|cvv|card/i;

export function recordWorkerAudit(input: {
  actor: string;
  workerId?: WorkerId;
  taskId?: string;
  executionId?: string;
  action: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}): WorkerAuditEntry {
  const sanitizedMeta = input.metadata
    ? Object.fromEntries(
        Object.entries(input.metadata).filter(([key]) => !SECRET_PATTERN.test(key))
      )
    : undefined;

  const entry: WorkerAuditEntry = {
    auditId: `waud_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    actor: input.actor,
    workerId: input.workerId,
    taskId: input.taskId,
    executionId: input.executionId,
    action: input.action,
    timestamp: new Date().toISOString(),
    correlationId: input.correlationId,
    metadata: sanitizedMeta,
  };
  auditLog.push(entry);
  return entry;
}

export function getWorkerAuditLog(executionId?: string): WorkerAuditEntry[] {
  if (executionId) return auditLog.filter((e) => e.executionId === executionId);
  return [...auditLog];
}

export function clearWorkerAuditLog(): void {
  auditLog.length = 0;
}
