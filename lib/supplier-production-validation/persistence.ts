import type { ValidationAuditEvent } from "./audit";
import type { SupplierProductionCapabilityValidation } from "./types";

const validationStore = new Map<string, SupplierProductionCapabilityValidation>();
const validationByIdempotency = new Map<string, string>();
const auditLog: ValidationAuditEvent[] = [];
const inflight = new Map<string, Promise<SupplierProductionCapabilityValidation>>();

function getPersistentStore() {
  if (typeof process === "undefined" || process.env.BUZZARD_SUPPLIER_PRODUCTION_VALIDATION_PERSISTENCE === "0") {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("../../server/lib/supplier-production-validation/persistentStore.js") as {
      createSupplierProductionValidationStore: () => ValidationStore;
    };
    return mod.createSupplierProductionValidationStore();
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

export function saveValidationRecord(record: SupplierProductionCapabilityValidation): void {
  validationStore.set(record.validationId, record);
  validationByIdempotency.set(record.idempotencyKey, record.validationId);
  getPersistentStore()?.saveValidation({
    validation_id: record.validationId,
    supplier_id: record.supplierId,
    market: record.market,
    channel: record.channel,
    environment: record.environment,
    overall_status: record.overallStatus,
    credential_status: record.credentialStatus,
    idempotency_key: record.idempotencyKey,
    correlation_id: record.correlationId,
    record_json: JSON.stringify(record),
    updated_at: record.updatedAt,
  });
}

export function getValidationRecord(validationId: string): SupplierProductionCapabilityValidation | undefined {
  return validationStore.get(validationId);
}

export function getValidationByIdempotency(idempotencyKey: string): SupplierProductionCapabilityValidation | undefined {
  const id = validationByIdempotency.get(idempotencyKey);
  return id ? validationStore.get(id) : undefined;
}

export function listValidationRecords(): SupplierProductionCapabilityValidation[] {
  return [...validationStore.values()];
}

export function appendValidationAuditEvent(event: ValidationAuditEvent): void {
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

export function listValidationAuditEvents(filter?: { validationId?: string; type?: string }): ValidationAuditEvent[] {
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
      const parsed = JSON.parse(String(row.record_json || "{}")) as SupplierProductionCapabilityValidation;
      if (parsed.validationId) {
        validationStore.set(parsed.validationId, parsed);
        validationByIdempotency.set(parsed.idempotencyKey, parsed.validationId);
      }
    } catch {
      /* ignore corrupt rows */
    }
  }
}

export function getInflightValidation(key: string): Promise<SupplierProductionCapabilityValidation> | undefined {
  return inflight.get(key);
}

export function setInflightValidation(key: string, promise: Promise<SupplierProductionCapabilityValidation>): void {
  inflight.set(key, promise);
}

export function clearInflightValidation(key: string): void {
  inflight.delete(key);
}

export function resetValidationForTests(): void {
  validationStore.clear();
  validationByIdempotency.clear();
  auditLog.splice(0, auditLog.length);
  inflight.clear();
}

export function getLatestValidationForScope(scope: {
  supplierId: string;
  market: string;
  channel: string;
  environment: string;
}): SupplierProductionCapabilityValidation | undefined {
  return listValidationRecords()
    .filter(
      (r) =>
        r.supplierId === scope.supplierId &&
        r.market === scope.market &&
        r.channel === scope.channel &&
        r.environment === scope.environment
    )
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];
}
