import { randomUUID } from "crypto";
import type { RehearsalAuditEvent } from "./types";
import { appendRehearsalAuditEvent, listRehearsalAuditEvents } from "./persistence";

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

export function recordRehearsalAudit(input: {
  type: string;
  rehearsalId?: string;
  orderId?: string;
  supplierId?: string;
  correlationId: string;
  detail?: Record<string, unknown>;
}): RehearsalAuditEvent {
  const event: RehearsalAuditEvent = {
    eventId: `rh_${randomUUID().slice(0, 12)}`,
    type: input.type,
    rehearsalId: input.rehearsalId,
    orderId: input.orderId,
    supplierId: input.supplierId,
    correlationId: input.correlationId,
    timestamp: new Date().toISOString(),
    detail: sanitizeDetail(input.detail),
  };
  appendRehearsalAuditEvent(event);
  return event;
}

export function listRehearsalAudit(filter?: { rehearsalId?: string; type?: string }): RehearsalAuditEvent[] {
  return listRehearsalAuditEvents(filter);
}

export function clearRehearsalAuditForTests(): void {
  const events = listRehearsalAuditEvents();
  events.splice(0, events.length);
}
