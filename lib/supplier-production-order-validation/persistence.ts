import type { CreateOrderValidationAuditEvent } from "./audit";
import type { ControlledValidationRun, ControlledValidationRunResult, SupplierProductionOrderValidation } from "./types";

const validationStore = new Map<string, SupplierProductionOrderValidation>();
const validationByIdempotency = new Map<string, string>();
const controlledRunStore = new Map<string, ControlledValidationRun>();
const controlledRunByIdempotency = new Map<string, string>();
const auditLog: CreateOrderValidationAuditEvent[] = [];
const inflight = new Map<string, Promise<SupplierProductionOrderValidation>>();
const inflightControlled = new Map<string, Promise<ControlledValidationRunResult>>();

function getPersistentStore() {
  if (typeof process === "undefined" || process.env.BUZZARD_SUPPLIER_PRODUCTION_ORDER_VALIDATION_PERSISTENCE === "0") {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("../../server/lib/supplier-production-order-validation/persistentStore.js") as {
      createSupplierProductionOrderValidationStore: () => ValidationStore;
    };
    return mod.createSupplierProductionOrderValidationStore();
  } catch {
    return null;
  }
}

interface ValidationStore {
  saveValidation(row: Record<string, unknown>): void;
  getValidation(validationId: string): Record<string, unknown> | undefined;
  listValidations(limit?: number): Record<string, unknown>[];
  saveAudit(row: Record<string, unknown>): void;
  listAudit(limit?: number): Record<string, unknown>[];
}

export function saveValidationRecord(record: SupplierProductionOrderValidation): void {
  validationStore.set(record.validationId, record);
  validationByIdempotency.set(record.idempotencyKey, record.validationId);
  getPersistentStore()?.saveValidation({
    validation_id: record.validationId,
    supplier_id: record.supplierId,
    market: record.market,
    channel: record.channel,
    environment: record.environment,
    overall_status: record.overallStatus,
    create_order_capability: record.createOrderCapability,
    idempotency_key: record.idempotencyKey,
    correlation_id: record.correlationId,
    record_json: JSON.stringify(record),
    updated_at: record.updatedAt,
  });
}

export function getValidationRecord(validationId: string): SupplierProductionOrderValidation | undefined {
  return validationStore.get(validationId);
}

export function getValidationByIdempotency(idempotencyKey: string): SupplierProductionOrderValidation | undefined {
  const id = validationByIdempotency.get(idempotencyKey);
  return id ? validationStore.get(id) : undefined;
}

export function listValidationRecords(): SupplierProductionOrderValidation[] {
  return [...validationStore.values()];
}

export function getLatestValidationForScope(scope: {
  supplierId: string;
  market: string;
  channel: string;
  environment: string;
}): SupplierProductionOrderValidation | undefined {
  return listValidationRecords()
    .filter(
      (r) =>
        r.supplierId === scope.supplierId &&
        r.market === scope.market &&
        r.channel === scope.channel &&
        r.environment === scope.environment,
    )
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];
}

export function appendValidationAuditEvent(event: CreateOrderValidationAuditEvent): void {
  auditLog.push(event);
  getPersistentStore()?.saveAudit({
    event_id: event.eventId,
    event_type: event.type,
    validation_id: event.validationId,
    supplier_id: event.supplierId,
    correlation_id: event.correlationId,
    timestamp: event.timestamp,
    detail_json: JSON.stringify(event.detail || {}),
  });
}

export function listValidationAuditEvents(filter?: {
  validationId?: string;
  type?: string;
}): CreateOrderValidationAuditEvent[] {
  return auditLog.filter((e) => {
    if (filter?.validationId && e.validationId !== filter.validationId) return false;
    if (filter?.type && e.type !== filter.type) return false;
    return true;
  });
}

export function hydrateValidationFromPersistence(): void {
  const store = getPersistentStore();
  if (!store) return;
  for (const row of store.listValidations(5000)) {
    try {
      const parsed = JSON.parse(String(row.record_json || "{}")) as SupplierProductionOrderValidation;
      if (parsed.validationId) {
        validationStore.set(parsed.validationId, parsed);
        validationByIdempotency.set(parsed.idempotencyKey, parsed.validationId);
      }
    } catch {
      /* ignore */
    }
  }
}

export function getInflightValidation(key: string): Promise<SupplierProductionOrderValidation> | undefined {
  return inflight.get(key);
}

export function setInflightValidation(key: string, promise: Promise<SupplierProductionOrderValidation>): void {
  inflight.set(key, promise);
}

export function clearInflightValidation(key: string): void {
  inflight.delete(key);
}

export function saveControlledValidationRun(run: ControlledValidationRun): void {
  controlledRunStore.set(run.validationId, run);
  controlledRunByIdempotency.set(run.idempotencyKey, run.validationId);
  getPersistentStore()?.saveValidation({
    validation_id: run.validationId,
    supplier_id: run.supplier,
    market: run.market,
    channel: run.channel,
    environment: run.environment,
    overall_status: run.overallStatus,
    create_order_capability: run.createOrderCapability,
    idempotency_key: run.idempotencyKey,
    correlation_id: run.correlationId,
    record_json: JSON.stringify({ ...run, recordType: "controlled_validation_run" }),
    updated_at: run.updatedAt,
  });
}

export function getControlledValidationRun(validationId: string): ControlledValidationRun | undefined {
  return controlledRunStore.get(validationId);
}

export function getControlledValidationRunByIdempotency(idempotencyKey: string): ControlledValidationRun | undefined {
  const id = controlledRunByIdempotency.get(idempotencyKey);
  return id ? controlledRunStore.get(id) : undefined;
}

export function listControlledValidationRuns(): ControlledValidationRun[] {
  return [...controlledRunStore.values()];
}

export function getLatestControlledValidationRun(scope?: {
  supplierId: string;
  market: string;
}): ControlledValidationRun | undefined {
  return listControlledValidationRuns()
    .filter((r) => {
      if (scope?.supplierId && r.supplier !== scope.supplierId) return false;
      if (scope?.market && r.market !== scope.market) return false;
      return true;
    })
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];
}

export function getInflightControlledRun(key: string): Promise<ControlledValidationRunResult> | undefined {
  return inflightControlled.get(key);
}

export function setInflightControlledRun(key: string, promise: Promise<ControlledValidationRunResult>): void {
  inflightControlled.set(key, promise);
}

export function clearInflightControlledRun(key: string): void {
  inflightControlled.delete(key);
}

export function resetValidationForTests(): void {
  validationStore.clear();
  validationByIdempotency.clear();
  controlledRunStore.clear();
  controlledRunByIdempotency.clear();
  auditLog.splice(0, auditLog.length);
  inflight.clear();
  inflightControlled.clear();
}
