import type { OrchestratorEvent, OrchestratorEventType, WorkerId } from "./types";
import { isEventProcessed, markEventProcessed } from "./taskRegistry";

const events: OrchestratorEvent[] = [];

export function emitOrchestratorEvent(input: {
  type: OrchestratorEventType;
  taskId?: string;
  workerId?: WorkerId;
  source: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}): OrchestratorEvent {
  const event: OrchestratorEvent = {
    eventId: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    taskId: input.taskId,
    workerId: input.workerId,
    type: input.type,
    timestamp: new Date().toISOString(),
    source: input.source,
    correlationId: input.correlationId,
    metadata: input.metadata,
  };
  events.push(event);
  return event;
}

export function getOrchestratorEvents(taskId?: string): OrchestratorEvent[] {
  if (taskId) return events.filter((e) => e.taskId === taskId);
  return [...events];
}

export function processWebhookEvent(input: {
  provider: string;
  eventId: string;
  eventType: string;
  payloadHash: string;
}): { ok: boolean; duplicate?: boolean; processedAt?: string } {
  const dedupeKey = `${input.provider}:${input.eventId}:${input.payloadHash}`;
  if (isEventProcessed(dedupeKey)) {
    return { ok: true, duplicate: true };
  }
  markEventProcessed(dedupeKey);
  emitOrchestratorEvent({
    type: "TASK_CREATED",
    source: `webhook:${input.provider}`,
    metadata: { eventType: input.eventType, payloadHash: input.payloadHash },
  });
  return { ok: true, processedAt: new Date().toISOString() };
}

export function clearOrchestratorEvents(): void {
  events.length = 0;
}
