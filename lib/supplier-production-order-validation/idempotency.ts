import { buildSupplierOrderIdempotencyKey, getIdempotentSupplierOrder, recordIdempotentSupplierOrder } from "@/lib/supplier-engine/orderIdempotency";
import type { CanonicalCreateOrderPayload } from "./payload";
import type { ValidationCheckResult } from "./types";

const validationIdempotencyStore = new Map<string, { validationId: string; createdAt: string }>();

export function buildCreateOrderValidationIdempotencyKey(payload: CanonicalCreateOrderPayload): string {
  return buildSupplierOrderIdempotencyKey(payload.supplierId, payload.buzzardOrderId, payload.idempotencyKey);
}

export function checkIdempotency(payload: CanonicalCreateOrderPayload): {
  checks: ValidationCheckResult[];
  blockers: string[];
  existingSupplierOrderId?: string;
  isDuplicate: boolean;
} {
  const key = buildCreateOrderValidationIdempotencyKey(payload);
  const existingOrderId = getIdempotentSupplierOrder(key);
  const existingValidation = validationIdempotencyStore.get(key);

  if (existingOrderId) {
    return {
      checks: [{
        check: "IDEMPOTENCY",
        category: "IDEMPOTENCY",
        status: "PASS",
        message: "Duplicate prevented — existing supplier order reference",
      }],
      blockers: [],
      existingSupplierOrderId: existingOrderId,
      isDuplicate: true,
    };
  }

  if (existingValidation) {
    return {
      checks: [{
        check: "IDEMPOTENCY",
        category: "IDEMPOTENCY",
        status: "BLOCKED",
        message: "Validation already in progress",
        blocking: true,
      }],
      blockers: ["DUPLICATE_IDEMPOTENCY"],
      isDuplicate: true,
    };
  }

  return {
    checks: [{
      check: "IDEMPOTENCY",
      category: "IDEMPOTENCY",
      status: "PASS",
      message: "Idempotency key valid",
    }],
    blockers: [],
    isDuplicate: false,
  };
}

export function claimValidationIdempotency(key: string, validationId: string): boolean {
  if (validationIdempotencyStore.has(key)) return false;
  validationIdempotencyStore.set(key, { validationId, createdAt: new Date().toISOString() });
  return true;
}

export function recordSuccessfulIdempotency(
  payload: CanonicalCreateOrderPayload,
  supplierOrderId: string,
): { replay: boolean } {
  const key = buildCreateOrderValidationIdempotencyKey(payload);
  return recordIdempotentSupplierOrder(key, supplierOrderId);
}

export function resetValidationIdempotencyForTests(): void {
  validationIdempotencyStore.clear();
}
