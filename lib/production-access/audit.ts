import { randomUUID } from "crypto";

export interface ProductionAccessAuditEvent {
  eventId: string;
  type: string;
  actor: string;
  correlationId: string;
  provider?: string;
  scope?: string;
  approval?: string;
  payloadHash?: string;
  result?: string;
  detail?: Record<string, unknown>;
  timestamp: string;
}

const auditLog: ProductionAccessAuditEvent[] = [];

function getPersistentStore() {
  if (typeof process === "undefined" || process.env.BUZZARD_PRODUCTION_ACCESS_PERSISTENCE === "0") {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("../../server/lib/production-access/persistentStore.js") as {
      createProductionAccessStore: () => { saveAudit(row: Record<string, unknown>): void };
    };
    return mod.createProductionAccessStore();
  } catch {
    return null;
  }
}

export function recordProductionAccessAudit(input: Omit<ProductionAccessAuditEvent, "eventId" | "timestamp">): ProductionAccessAuditEvent {
  const event: ProductionAccessAuditEvent = {
    eventId: randomUUID(),
    timestamp: new Date().toISOString(),
    ...input,
  };
  auditLog.push(event);
  getPersistentStore()?.saveAudit({
    event_id: event.eventId,
    type: event.type,
    actor: event.actor,
    correlation_id: event.correlationId,
    provider: event.provider || null,
    scope: event.scope || null,
    approval: event.approval || null,
    payload_hash: event.payloadHash || null,
    result: event.result || null,
    detail_json: event.detail ? JSON.stringify(event.detail) : null,
    timestamp: event.timestamp,
  });
  return event;
}

export function listProductionAccessAudit(limit = 100): ProductionAccessAuditEvent[] {
  return auditLog.slice(-limit);
}

export function resetProductionAccessAuditForTests(): void {
  auditLog.length = 0;
}
