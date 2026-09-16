import { randomUUID } from "crypto";

export type GoLiveAuditType =
  | "GO_LIVE_REVIEW_REQUESTED"
  | "GO_LIVE_REVIEW_STARTED"
  | "GO_LIVE_BLOCKED"
  | "GO_LIVE_APPROVAL_REQUESTED"
  | "GO_LIVE_APPROVED"
  | "CONTROLLED_GO_LIVE_ACTIVATED"
  | "CONTROLLED_GO_LIVE_PAUSED"
  | "CONTROLLED_GO_LIVE_EXPIRED"
  | "GO_LIVE_ROLLBACK"
  | "FIRST_ORDER_VALIDATED"
  | "FIRST_ORDER_VALIDATION_FAILED"
  | "SUPPLIER_CONFIRMATION_VALIDATED"
  | "FULFILLMENT_RECONCILIATION_FAILED"
  | "FINANCIAL_RECONCILIATION_FAILED";

export interface GoLiveAuditEvent {
  eventId: string;
  type: GoLiveAuditType;
  goLiveId?: string;
  supplierId?: string;
  correlationId: string;
  actor?: string;
  timestamp: string;
  detail?: Record<string, unknown>;
}

const auditLog: GoLiveAuditEvent[] = [];

export function recordGoLiveAudit(event: Omit<GoLiveAuditEvent, "eventId" | "timestamp">): void {
  auditLog.push({
    eventId: `cglaud_${randomUUID().slice(0, 12)}`,
    timestamp: new Date().toISOString(),
    ...event,
  });
}

export function listGoLiveAudit(filter?: { goLiveId?: string; type?: GoLiveAuditType }): GoLiveAuditEvent[] {
  return auditLog.filter((e) => {
    if (filter?.goLiveId && e.goLiveId !== filter.goLiveId) return false;
    if (filter?.type && e.type !== filter.type) return false;
    return true;
  });
}

export function clearGoLiveAuditForTests(): void {
  auditLog.splice(0, auditLog.length);
}
