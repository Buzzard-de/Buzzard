import type { FirstOrderAuditEvent } from "./audit";
import type {
  ExecutionAuthorization,
  FirstProductionOrderApproval,
  FirstProductionOrderRecord,
} from "./types";

const executionStore = new Map<string, FirstProductionOrderRecord>();
const executionByIdempotency = new Map<string, string>();
const approvalStore = new Map<string, FirstProductionOrderApproval>();
const authorizationStore = new Map<string, ExecutionAuthorization>();
const auditLog: FirstOrderAuditEvent[] = [];
const inflight = new Map<string, Promise<FirstProductionOrderRecord>>();

function getPersistentStore() {
  if (typeof process === "undefined" || process.env.BUZZARD_SUPPLIER_FIRST_PRODUCTION_ORDER_PERSISTENCE === "0") {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("../../server/lib/supplier-first-production-order/persistentStore.js") as {
      createSupplierFirstProductionOrderStore: () => FirstOrderStore;
    };
    return mod.createSupplierFirstProductionOrderStore();
  } catch {
    return null;
  }
}

interface FirstOrderStore {
  saveExecution(row: Record<string, unknown>): void;
  getExecution(executionId: string): Record<string, unknown> | undefined;
  listExecutions(limit?: number): Record<string, unknown>[];
  saveAudit(row: Record<string, unknown>): void;
  listAudit(limit?: number): Record<string, unknown>[];
}

export function saveFirstProductionOrderRecord(record: FirstProductionOrderRecord): void {
  executionStore.set(record.executionId, record);
  executionByIdempotency.set(record.idempotencyKey, record.executionId);
  getPersistentStore()?.saveExecution({
    execution_id: record.executionId,
    order_id: record.orderId,
    supplier_id: record.supplier,
    state: record.state,
    idempotency_key: record.idempotencyKey,
    correlation_id: record.correlationId,
    record_json: JSON.stringify(record),
    updated_at: record.updatedAt,
  });
}

export function getFirstProductionOrderRecord(executionId: string): FirstProductionOrderRecord | undefined {
  return executionStore.get(executionId);
}

export function getFirstProductionOrderByIdempotency(idempotencyKey: string): FirstProductionOrderRecord | undefined {
  const id = executionByIdempotency.get(idempotencyKey);
  return id ? executionStore.get(id) : undefined;
}

export function listFirstProductionOrderRecords(): FirstProductionOrderRecord[] {
  return [...executionStore.values()];
}

export function getLatestFirstProductionOrderForScope(scope: {
  supplierId: string;
  market: string;
  channel: string;
}): FirstProductionOrderRecord | undefined {
  return listFirstProductionOrderRecords()
    .filter(
      (r) =>
        r.supplier === scope.supplierId &&
        r.scope.market === scope.market &&
        r.scope.channel === scope.channel,
    )
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];
}

export function saveFirstProductionOrderApproval(approval: FirstProductionOrderApproval): void {
  approvalStore.set(approval.approvalId, approval);
}

export function getFirstProductionOrderApproval(approvalId: string): FirstProductionOrderApproval | undefined {
  return approvalStore.get(approvalId);
}

export function saveExecutionAuthorization(auth: ExecutionAuthorization): void {
  authorizationStore.set(auth.authorizationId, auth);
}

export function getExecutionAuthorization(authorizationId: string): ExecutionAuthorization | undefined {
  return authorizationStore.get(authorizationId);
}

export function getInflightFirstProductionOrder(idempotencyKey: string): Promise<FirstProductionOrderRecord> | undefined {
  return inflight.get(idempotencyKey);
}

export function setInflightFirstProductionOrder(idempotencyKey: string, promise: Promise<FirstProductionOrderRecord>): void {
  inflight.set(idempotencyKey, promise);
}

export function clearInflightFirstProductionOrder(idempotencyKey: string): void {
  inflight.delete(idempotencyKey);
}

export function hydrateFirstProductionOrderFromPersistence(): void {
  const store = getPersistentStore();
  if (!store) return;
  for (const row of store.listExecutions(5000)) {
    try {
      const parsed = JSON.parse(String(row.record_json || "{}")) as FirstProductionOrderRecord;
      if (parsed.executionId) {
        executionStore.set(parsed.executionId, parsed);
        executionByIdempotency.set(parsed.idempotencyKey, parsed.executionId);
      }
    } catch {
      /* ignore */
    }
  }
}

export function resetFirstProductionOrderForTests(): void {
  executionStore.clear();
  executionByIdempotency.clear();
  approvalStore.clear();
  authorizationStore.clear();
  auditLog.splice(0, auditLog.length);
  inflight.clear();
}
