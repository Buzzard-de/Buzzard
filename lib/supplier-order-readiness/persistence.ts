import type { ReadinessAuditEvent, SupplierOrderApproval, SupplierOrderReadiness } from "./types";
import type { KillSwitchState } from "./killSwitch";

const readinessStore = new Map<string, SupplierOrderReadiness>();
const approvalStore = new Map<string, SupplierOrderApproval>();
const auditLog: ReadinessAuditEvent[] = [];
let killSwitchState: KillSwitchState | null = null;

function readinessKey(supplierId: string, market: string, channel: string): string {
  return `${supplierId}:${market}:${channel}`;
}

function getPersistentStore() {
  if (typeof process === "undefined" || process.env.BUZZARD_SUPPLIER_ORDER_READINESS_PERSISTENCE === "0") {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("../../server/lib/supplier-order-readiness/persistentStore.js") as {
      createSupplierOrderReadinessStore: () => SupplierOrderReadinessStore;
    };
    return mod.createSupplierOrderReadinessStore();
  } catch {
    return null;
  }
}

interface SupplierOrderReadinessStore {
  saveReadiness(row: Record<string, unknown>): void;
  getReadiness(readinessId: string): Record<string, unknown> | undefined;
  listReadiness(): Record<string, unknown>[];
  saveApproval(row: Record<string, unknown>): void;
  getApproval(approvalId: string): Record<string, unknown> | undefined;
  listApprovals(): Record<string, unknown>[];
  saveAudit(row: Record<string, unknown>): void;
  listAudit(limit?: number): Record<string, unknown>[];
  saveKillSwitch(row: Record<string, unknown>): void;
  getKillSwitch(): Record<string, unknown> | undefined;
}

export function saveReadinessRecord(record: SupplierOrderReadiness): void {
  readinessStore.set(record.readinessId, record);
  getPersistentStore()?.saveReadiness({
    readiness_id: record.readinessId,
    supplier_id: record.supplierId,
    market: record.market,
    channel: record.channel,
    overall_status: record.overallStatus,
    approval_status: record.approvalStatus,
    generated_at: record.generatedAt,
    expires_at: record.expiresAt,
    record_json: JSON.stringify(record),
    updated_at: new Date().toISOString(),
  });
}

export function getReadinessRecord(readinessId: string): SupplierOrderReadiness | undefined {
  return readinessStore.get(readinessId);
}

export function getReadinessByScope(supplierId: string, market: string, channel: string): SupplierOrderReadiness | undefined {
  const id = readinessKey(supplierId, market, channel);
  for (const record of readinessStore.values()) {
    if (`${record.supplierId}:${record.market}:${record.channel}` === id) return record;
  }
  return undefined;
}

export function listReadinessRecords(): SupplierOrderReadiness[] {
  return [...readinessStore.values()];
}

export function saveApprovalRecord(record: SupplierOrderApproval): void {
  approvalStore.set(record.approvalId, record);
  getPersistentStore()?.saveApproval({
    approval_id: record.approvalId,
    readiness_id: record.readinessId,
    supplier_id: record.supplierId,
    market: record.market,
    channel: record.channel,
    status: record.status,
    requester: record.requester,
    approver: record.approver,
    requested_at: record.requestedAt,
    approved_at: record.approvedAt,
    rejected_at: record.rejectedAt,
    rejection_reason: record.rejectionReason,
    expires_at: record.expiresAt,
    record_json: JSON.stringify(record),
    updated_at: new Date().toISOString(),
  });
}

export function getApprovalRecord(approvalId: string): SupplierOrderApproval | undefined {
  return approvalStore.get(approvalId);
}

export function getApprovalForScope(
  supplierId: string,
  market: string,
  channel: string,
  status?: SupplierOrderApproval["status"]
): SupplierOrderApproval | undefined {
  const matches = [...approvalStore.values()].filter(
    (a) => a.supplierId === supplierId && a.market === market && a.channel === channel
  );
  if (status) return matches.find((a) => a.status === status);
  return matches.sort((a, b) => Date.parse(b.requestedAt) - Date.parse(a.requestedAt))[0];
}

export function listApprovalRecords(): SupplierOrderApproval[] {
  return [...approvalStore.values()];
}

export function appendAuditEvent(event: ReadinessAuditEvent): void {
  auditLog.push(event);
  getPersistentStore()?.saveAudit({
    event_id: event.eventId,
    event_type: event.type,
    supplier_id: event.supplierId,
    market: event.market,
    channel: event.channel,
    actor: event.actor,
    correlation_id: event.correlationId,
    timestamp: event.timestamp,
    detail_json: JSON.stringify(event.detail || {}),
  });
}

export function listAuditEvents(filter?: { supplierId?: string; type?: string }): ReadinessAuditEvent[] {
  return auditLog.filter((e) => {
    if (filter?.supplierId && e.supplierId !== filter.supplierId) return false;
    if (filter?.type && e.type !== filter.type) return false;
    return true;
  });
}

export function saveKillSwitchState(state: KillSwitchState): void {
  killSwitchState = state;
  getPersistentStore()?.saveKillSwitch({
    state_json: JSON.stringify(state),
    updated_at: state.updatedAt,
    updated_by: state.updatedBy,
  });
}

export function getKillSwitchState(): KillSwitchState | null {
  return killSwitchState;
}

export function hydrateReadinessFromPersistence(): void {
  const store = getPersistentStore();
  if (!store) return;
  for (const row of store.listReadiness()) {
    try {
      const parsed = JSON.parse(String(row.record_json || "{}")) as SupplierOrderReadiness;
      if (parsed.readinessId) readinessStore.set(parsed.readinessId, parsed);
    } catch {
      /* ignore malformed */
    }
  }
  for (const row of store.listApprovals()) {
    try {
      const parsed = JSON.parse(String(row.record_json || "{}")) as SupplierOrderApproval;
      if (parsed.approvalId) approvalStore.set(parsed.approvalId, parsed);
    } catch {
      /* ignore malformed */
    }
  }
  const ks = store.getKillSwitch();
  if (ks?.state_json) {
    try {
      killSwitchState = JSON.parse(String(ks.state_json)) as KillSwitchState;
    } catch {
      killSwitchState = null;
    }
  }
}

export function resetReadinessForTests(): void {
  readinessStore.clear();
  approvalStore.clear();
  auditLog.splice(0, auditLog.length);
  killSwitchState = null;
}
