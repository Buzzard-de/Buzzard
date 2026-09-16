import { randomUUID } from "crypto";
import { appendValidationAuditEvent, listValidationAuditEvents } from "./persistence";

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
    else if (typeof value === "string" && value.length > 64 && /token|secret|key/i.test(key)) {
      out[key] = "[REDACTED]";
    } else out[key] = value;
  }
  return out;
}

export interface ValidationAuditEvent {
  eventId: string;
  type: string;
  validationId?: string;
  supplierId?: string;
  correlationId: string;
  timestamp: string;
  detail?: Record<string, unknown>;
}

export function recordValidationAudit(input: {
  type: string;
  validationId?: string;
  supplierId?: string;
  correlationId: string;
  detail?: Record<string, unknown>;
}): ValidationAuditEvent {
  const event: ValidationAuditEvent = {
    eventId: `pv_${randomUUID().slice(0, 12)}`,
    type: input.type,
    validationId: input.validationId,
    supplierId: input.supplierId,
    correlationId: input.correlationId,
    timestamp: new Date().toISOString(),
    detail: sanitizeDetail(input.detail),
  };
  appendValidationAuditEvent(event);
  return event;
}

export function listValidationAudit(filter?: { validationId?: string; type?: string }): ValidationAuditEvent[] {
  return listValidationAuditEvents(filter);
}

export function clearValidationAuditForTests(): void {
  const events = listValidationAuditEvents();
  events.splice(0, events.length);
}
