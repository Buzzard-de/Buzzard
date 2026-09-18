import { randomUUID } from "crypto";
import type { FinalClosureAuditEvent, FinalClosureState } from "./types";

const auditLog: FinalClosureAuditEvent[] = [];

export function recordFinalClosureTransition(input: {
  fromState: FinalClosureState;
  toState: FinalClosureState;
  operator: string;
  approval?: string;
  evidenceId?: string;
  scope?: string;
  correlationId?: string;
}): FinalClosureAuditEvent {
  const event: FinalClosureAuditEvent = {
    eventId: randomUUID(),
    fromState: input.fromState,
    toState: input.toState,
    operator: input.operator,
    timestamp: new Date().toISOString(),
    approval: input.approval,
    evidenceId: input.evidenceId,
    scope: input.scope,
    correlationId: input.correlationId || randomUUID(),
  };
  auditLog.push(event);
  return event;
}

export function listFinalClosureAudit(limit = 100): FinalClosureAuditEvent[] {
  return auditLog.slice(-limit);
}

export function resetFinalClosureAuditForTests(): void {
  auditLog.length = 0;
}
