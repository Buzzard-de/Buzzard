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
  "shippingaddress",
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

export interface CreateOrderValidationAuditEvent {
  eventId: string;
  type: string;
  validationId?: string;
  orderId?: string;
  supplierId?: string;
  correlationId: string;
  actor?: string;
  timestamp: string;
  detail?: Record<string, unknown>;
}

export function recordCreateOrderValidationAudit(input: {
  type: string;
  validationId?: string;
  orderId?: string;
  supplierId?: string;
  correlationId: string;
  actor?: string;
  detail?: Record<string, unknown>;
}): CreateOrderValidationAuditEvent {
  const event: CreateOrderValidationAuditEvent = {
    eventId: `co341_${randomUUID().slice(0, 12)}`,
    type: input.type,
    validationId: input.validationId,
    orderId: input.orderId,
    supplierId: input.supplierId,
    correlationId: input.correlationId,
    actor: input.actor,
    timestamp: new Date().toISOString(),
    detail: sanitizeDetail(input.detail),
  };
  appendValidationAuditEvent(event);
  return event;
}

export function listCreateOrderValidationAudit(filter?: {
  validationId?: string;
  type?: string;
}): CreateOrderValidationAuditEvent[] {
  return listValidationAuditEvents(filter);
}

export function clearCreateOrderValidationAuditForTests(): void {
  const events = listValidationAuditEvents();
  events.splice(0, events.length);
}
