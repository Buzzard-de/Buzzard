import { randomUUID } from "crypto";
import type { ReadinessAuditEvent } from "./types";
import { appendAuditEvent, listAuditEvents } from "./persistence";

export function recordReadinessAudit(input: {
  type: string;
  supplierId?: string;
  market?: string;
  channel?: string;
  actor?: string;
  correlationId: string;
  detail?: Record<string, unknown>;
}): ReadinessAuditEvent {
  const event: ReadinessAuditEvent = {
    eventId: `ra_${randomUUID().slice(0, 12)}`,
    type: input.type,
    supplierId: input.supplierId,
    market: input.market,
    channel: input.channel,
    actor: input.actor,
    correlationId: input.correlationId,
    timestamp: new Date().toISOString(),
    detail: input.detail ? sanitizeAuditDetail(input.detail) : undefined,
  };
  appendAuditEvent(event);
  return event;
}

function sanitizeAuditDetail(detail: Record<string, unknown>): Record<string, unknown> {
  const blocked = new Set(["password", "token", "secret", "credential", "email", "phone", "accessToken", "apiKey"]);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(detail)) {
    if (blocked.has(key.toLowerCase())) {
      out[key] = "[REDACTED]";
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function listReadinessAudit(filter?: { supplierId?: string; type?: string }): ReadinessAuditEvent[] {
  return listAuditEvents(filter);
}

export function clearReadinessAuditForTests(): void {
  const events = listAuditEvents();
  events.splice(0, events.length);
}
