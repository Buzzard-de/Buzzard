import type { AuditEntry, WorkerId } from "./types";

const auditLog: AuditEntry[] = [];

const SECRET_PATTERN = /api[_-]?key|secret|password|token|authorization|bearer|credential|cvv|card/i;

function sanitizeAuditPayload(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    if (SECRET_PATTERN.test(value)) return "[REDACTED]";
    return value;
  }
  if (Array.isArray(value)) return value.map(sanitizeAuditPayload);
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (SECRET_PATTERN.test(key)) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = sanitizeAuditPayload(val);
      }
    }
    return sanitized;
  }
  return value;
}

export function recordAudit(input: {
  actor: string;
  actorType: AuditEntry["actorType"];
  taskId?: string;
  workerId?: WorkerId;
  action: string;
  previousState?: string;
  newState?: string;
  correlationId?: string;
  reason?: string;
}): AuditEntry {
  const entry: AuditEntry = {
    auditId: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    actor: input.actor,
    actorType: input.actorType,
    taskId: input.taskId,
    workerId: input.workerId,
    action: input.action,
    previousState: input.previousState,
    newState: input.newState,
    timestamp: new Date().toISOString(),
    correlationId: input.correlationId,
    reason: typeof input.reason === "string" ? (sanitizeAuditPayload(input.reason) as string) : input.reason,
  };
  auditLog.push(entry);
  return entry;
}

export function getAuditLog(taskId?: string): AuditEntry[] {
  if (taskId) return auditLog.filter((e) => e.taskId === taskId);
  return [...auditLog];
}

export function clearAuditLog(): void {
  auditLog.length = 0;
}
