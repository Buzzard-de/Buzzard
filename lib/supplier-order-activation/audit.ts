import { randomUUID } from "crypto";
import { appendActivationAuditEvent, listActivationAuditEvents } from "./persistence";

const BLOCKED_KEYS = new Set([
  "password",
  "token",
  "secret",
  "credential",
  "email",
  "phone",
  "accesstoken",
  "apikey",
  "payment",
  "bearertoken",
]);

function sanitizeDetail(detail?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!detail) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(detail)) {
    if (BLOCKED_KEYS.has(key.toLowerCase())) out[key] = "[REDACTED]";
    else out[key] = value;
  }
  return out;
}

export interface ActivationAuditEvent {
  eventId: string;
  type: string;
  activationId?: string;
  firstOrderId?: string;
  supplierId?: string;
  correlationId: string;
  actor?: string;
  timestamp: string;
  detail?: Record<string, unknown>;
}

export function recordActivationAudit(input: {
  type: string;
  activationId?: string;
  firstOrderId?: string;
  supplierId?: string;
  correlationId: string;
  actor?: string;
  detail?: Record<string, unknown>;
}): ActivationAuditEvent {
  const event: ActivationAuditEvent = {
    eventId: `ao_${randomUUID().slice(0, 12)}`,
    type: input.type,
    activationId: input.activationId,
    firstOrderId: input.firstOrderId,
    supplierId: input.supplierId,
    correlationId: input.correlationId,
    actor: input.actor,
    timestamp: new Date().toISOString(),
    detail: sanitizeDetail(input.detail),
  };
  appendActivationAuditEvent(event);
  return event;
}

export function listActivationAudit(filter?: {
  activationId?: string;
  type?: string;
}): ActivationAuditEvent[] {
  return listActivationAuditEvents(filter);
}

export function clearActivationAuditForTests(): void {
  const events = listActivationAuditEvents();
  events.splice(0, events.length);
}
