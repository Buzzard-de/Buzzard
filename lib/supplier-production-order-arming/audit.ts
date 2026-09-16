import { randomUUID } from "crypto";
import { appendArmingAuditEvent, listArmingAuditEvents } from "./persistence";

const BLOCKED_KEYS = new Set([
  "password", "token", "secret", "credential", "accesstoken", "apikey", "bearertoken", "payment",
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

export interface ArmingAuditEvent {
  eventId: string;
  type: string;
  armingId?: string;
  supplierId?: string;
  correlationId: string;
  actor?: string;
  timestamp: string;
  detail?: Record<string, unknown>;
}

export function recordArmingAudit(input: {
  type: string;
  armingId?: string;
  supplierId?: string;
  correlationId: string;
  actor?: string;
  detail?: Record<string, unknown>;
}): ArmingAuditEvent {
  const event: ArmingAuditEvent = {
    eventId: `arm343_${randomUUID().slice(0, 12)}`,
    type: input.type,
    armingId: input.armingId,
    supplierId: input.supplierId,
    correlationId: input.correlationId,
    actor: input.actor,
    timestamp: new Date().toISOString(),
    detail: sanitizeDetail(input.detail),
  };
  appendArmingAuditEvent(event);
  return event;
}

export function listArmingAudit(filter?: { armingId?: string; type?: string }): ArmingAuditEvent[] {
  return listArmingAuditEvents(filter);
}

export function clearArmingAuditForTests(): void {
  const events = listArmingAuditEvents();
  events.splice(0, events.length);
}
