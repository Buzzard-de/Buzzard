import { randomUUID } from "crypto";

export type FirstOrderAuditType =
  | "FIRST_ORDER_REQUESTED"
  | "FIRST_ORDER_PREFLIGHT"
  | "FIRST_ORDER_BLOCKED"
  | "FIRST_ORDER_APPROVAL_REQUESTED"
  | "FIRST_ORDER_APPROVED"
  | "FIRST_ORDER_AUTHORIZED"
  | "FIRST_ORDER_EXECUTION_STARTED"
  | "FIRST_ORDER_EXECUTED"
  | "FIRST_ORDER_FAILED"
  | "FIRST_ORDER_UNKNOWN_OUTCOME"
  | "FIRST_ORDER_CANCELLED"
  | "FIRST_ORDER_EXPIRED"
  | "FIRST_ORDER_KILL_SWITCHED"
  | "FIRST_ORDER_REPLAY_BLOCKED";

export interface FirstOrderAuditEvent {
  eventId: string;
  type: FirstOrderAuditType;
  executionId?: string;
  orderId?: string;
  supplierId?: string;
  correlationId: string;
  actor?: string;
  timestamp: string;
  detail?: Record<string, unknown>;
}

const auditLog: FirstOrderAuditEvent[] = [];

export function recordFirstOrderAudit(event: Omit<FirstOrderAuditEvent, "eventId" | "timestamp">): void {
  auditLog.push({
    eventId: `fpoaud_${randomUUID().slice(0, 12)}`,
    timestamp: new Date().toISOString(),
    ...event,
  });
}

export function listFirstOrderAudit(filter?: {
  executionId?: string;
  type?: FirstOrderAuditType;
}): FirstOrderAuditEvent[] {
  return auditLog.filter((e) => {
    if (filter?.executionId && e.executionId !== filter.executionId) return false;
    if (filter?.type && e.type !== filter.type) return false;
    return true;
  });
}

export function clearFirstOrderAuditForTests(): void {
  auditLog.splice(0, auditLog.length);
}
