import { createHash } from "crypto";
import { getWebhookByHash, saveWebhookEvent } from "./registry";
import type { MarketplaceEvent, MarketplaceEventType, WebhookEvent } from "./types";

const events: MarketplaceEvent[] = [];
const MAX_EVENTS = 2000;

function generateEventId(): string {
  return `mpe_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function emitMarketplaceEvent(input: {
  marketplaceId: string;
  type: MarketplaceEventType;
  source: string;
  metadata?: Record<string, unknown>;
}): MarketplaceEvent {
  const event: MarketplaceEvent = {
    eventId: generateEventId(),
    marketplaceId: input.marketplaceId,
    type: input.type,
    timestamp: new Date().toISOString(),
    source: input.source,
    metadata: input.metadata,
  };
  events.push(event);
  if (events.length > MAX_EVENTS) events.shift();
  return event;
}

export function getMarketplaceEvents(marketplaceId?: string): MarketplaceEvent[] {
  return marketplaceId ? events.filter((e) => e.marketplaceId === marketplaceId) : [...events];
}

export function clearMarketplaceEvents(): void {
  events.length = 0;
}

export function hashWebhookPayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function receiveWebhook(input: {
  marketplaceId: string;
  eventType: string;
  payload: unknown;
}): { ok: boolean; event?: WebhookEvent; duplicate?: boolean; errorCode?: string } {
  const payloadHash = hashWebhookPayload(input.payload);
  const existing = getWebhookByHash(input.marketplaceId, payloadHash);
  if (existing) {
    return { ok: true, event: existing, duplicate: true };
  }

  const event: WebhookEvent = {
    eventId: generateEventId(),
    marketplaceId: input.marketplaceId,
    eventType: input.eventType,
    payloadHash,
    receivedAt: new Date().toISOString(),
    status: "RECEIVED",
  };
  saveWebhookEvent(event);

  emitMarketplaceEvent({
    marketplaceId: input.marketplaceId,
    type: "WEBHOOK_RECEIVED",
    source: "webhook",
    metadata: { eventType: input.eventType, payloadHash },
  });

  const processed: WebhookEvent = {
    ...event,
    status: "PROCESSED",
    processedAt: new Date().toISOString(),
  };
  saveWebhookEvent(processed);

  return { ok: true, event: processed };
}
