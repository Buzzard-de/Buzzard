import { createHash } from "crypto";
import { getWebhookByHash, saveWebhookEvent } from "./registry";
import type { ReturnEvent, ReturnEventType, ReturnWebhookEvent } from "./types";

const events: ReturnEvent[] = [];
const MAX_EVENTS = 2000;

function generateEventId(): string {
  return `rte_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function emitReturnEvent(input: {
  returnId: string;
  type: ReturnEventType;
  source: string;
  metadata?: Record<string, unknown>;
}): ReturnEvent {
  const event: ReturnEvent = {
    eventId: generateEventId(),
    returnId: input.returnId,
    type: input.type,
    timestamp: new Date().toISOString(),
    source: input.source,
    metadata: input.metadata,
  };
  events.push(event);
  if (events.length > MAX_EVENTS) events.shift();
  return event;
}

export function getReturnEvents(returnId?: string): ReturnEvent[] {
  return returnId ? events.filter((e) => e.returnId === returnId) : [...events];
}

export function clearReturnEvents(): void {
  events.length = 0;
}

export function hashReturnWebhookPayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function receiveReturnWebhook(input: {
  provider: string;
  eventType: string;
  payload: unknown;
  returnId?: string;
}): { ok: boolean; event?: ReturnWebhookEvent; duplicate?: boolean } {
  const payloadHash = hashReturnWebhookPayload(input.payload);
  const existing = getWebhookByHash(input.provider, payloadHash);
  if (existing) return { ok: true, event: existing, duplicate: true };

  const event: ReturnWebhookEvent = {
    eventId: generateEventId(),
    provider: input.provider,
    eventType: input.eventType,
    payloadHash,
    returnId: input.returnId,
    receivedAt: new Date().toISOString(),
    status: "RECEIVED",
  };
  saveWebhookEvent(event);

  const processed: ReturnWebhookEvent = {
    ...event,
    status: "PROCESSED",
    processedAt: new Date().toISOString(),
  };
  saveWebhookEvent(processed);

  return { ok: true, event: processed };
}
