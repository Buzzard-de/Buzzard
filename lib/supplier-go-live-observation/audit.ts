import { randomUUID } from "crypto";

export type ObservationAuditType =
  | "OBSERVATION_STARTED"
  | "OBSERVATION_PAUSED"
  | "OBSERVATION_COMPLETED"
  | "OBSERVATION_FAILED"
  | "OBSERVATION_REVIEW_REQUESTED"
  | "OBSERVATION_REVIEW_BLOCKED"
  | "BROADER_ROLLOUT_APPROVAL_REQUESTED"
  | "BROADER_ROLLOUT_APPROVED"
  | "BROADER_ROLLOUT_ACTIVATED"
  | "BROADER_ROLLOUT_PAUSED"
  | "BROADER_ROLLOUT_ROLLED_BACK"
  | "BROADER_ROLLOUT_EXPIRED"
  | "BROADER_ROLLOUT_KILL_SWITCHED"
  | "SCOPE_CHANGE_APPROVAL_INVALIDATED"
  | "THRESHOLD_BREACH"
  | "CRITICAL_INCIDENT";

export interface ObservationAuditEvent {
  eventId: string;
  type: ObservationAuditType;
  observationId?: string;
  rolloutId?: string;
  supplierId?: string;
  correlationId: string;
  actor?: string;
  timestamp: string;
  detail?: Record<string, unknown>;
}

const auditLog: ObservationAuditEvent[] = [];

export function recordObservationAudit(input: Omit<ObservationAuditEvent, "eventId" | "timestamp">): void {
  auditLog.push({
    ...input,
    eventId: `obsaud_${randomUUID().slice(0, 12)}`,
    timestamp: new Date().toISOString(),
  });
  getPersistentStore()?.saveAudit({
    event_id: auditLog[auditLog.length - 1].eventId,
    event_type: input.type,
    observation_id: input.observationId,
    rollout_id: input.rolloutId,
    supplier_id: input.supplierId,
    correlation_id: input.correlationId,
    timestamp: auditLog[auditLog.length - 1].timestamp,
    detail_json: JSON.stringify(sanitizeDetail(input.detail)),
  });
}

function sanitizeDetail(detail?: Record<string, unknown>): Record<string, unknown> {
  if (!detail) return {};
  const blocked = ["password", "secret", "token", "credential", "apiKey"];
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(detail)) {
    if (blocked.some((b) => k.toLowerCase().includes(b))) continue;
    out[k] = v;
  }
  return out;
}

function getPersistentStore() {
  if (typeof process === "undefined" || process.env.BUZZARD_SUPPLIER_GO_LIVE_OBSERVATION_PERSISTENCE === "0") {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("../../server/lib/supplier-go-live-observation/persistentStore.js") as {
      createSupplierGoLiveObservationStore: () => { saveAudit: (row: Record<string, unknown>) => void };
    };
    return mod.createSupplierGoLiveObservationStore();
  } catch {
    return null;
  }
}

export function listObservationAudit(filter?: { observationId?: string; rolloutId?: string }): ObservationAuditEvent[] {
  return auditLog.filter((e) => {
    if (filter?.observationId && e.observationId !== filter.observationId) return false;
    if (filter?.rolloutId && e.rolloutId !== filter.rolloutId) return false;
    return true;
  });
}

export function clearObservationAuditForTests(): void {
  auditLog.splice(0, auditLog.length);
}
