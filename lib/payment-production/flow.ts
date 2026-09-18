import { randomUUID } from "crypto";
import {
  authorizePayment,
  capturePayment,
  cancelPayment,
  createPendingPayment,
} from "@/lib/order-engine/payment";
import { getDefaultPaymentProviderKind, isPaymentProductionEnabled } from "./config";
import { checkCaptureIdempotency, checkIdempotencyKey } from "./idempotency";
import { getPaymentProviderAdapter } from "./providers/registry";
import { assertPaymentCaptureSafety, assertPaymentProductionSafety } from "./safety";
import {
  getPaymentProductionRecord,
  savePaymentProductionRecord,
  updatePaymentProductionState,
} from "./persistence";
import type {
  PaymentCaptureInput,
  PaymentCreateInput,
  PaymentProductionRecord,
  PaymentProductionState,
  PaymentProviderKind,
} from "./types";

/**
 * Payment → Order Engine flow:
 * CHECKOUT → PAYMENT_CREATED → AUTHORIZED → CAPTURED → ORDER_CONFIRMED
 * No PAID state without validated payment capture.
 */
export function createPaymentIntent(input: PaymentCreateInput): PaymentProductionRecord {
  assertPaymentProductionSafety();

  if (!checkIdempotencyKey(input.idempotencyKey)) {
    const existing = findRecordByIdempotencyKey(input.idempotencyKey);
    if (existing) return existing;
  }

  const providerKind = input.provider ?? getDefaultPaymentProviderKind();
  const adapter = getPaymentProviderAdapter(providerKind) ?? getPaymentProviderAdapter("MOCK")!;
  const createResult = adapter.createPayment(input);

  const payment = createPendingPayment({
    orderId: input.orderId,
    amount: input.amount,
    currency: input.currency,
    provider: providerKind.toLowerCase(),
    method: input.methodCategory,
  });

  const state: PaymentProductionState = createResult.state ?? "CREATED";
  const record: PaymentProductionRecord = {
    paymentId: payment.paymentId,
    orderId: input.orderId,
    providerId: providerKind,
    methodCategory: input.methodCategory ?? adapter.category,
    amount: input.amount,
    currency: input.currency,
    state,
    idempotencyKey: input.idempotencyKey,
    dryRun: !isPaymentProductionEnabled(),
    providerToken: createResult.providerToken,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
  savePaymentProductionRecord(record);
  idempotencyIndex.set(input.idempotencyKey, record.paymentId);
  return record;
}

export function authorizePaymentIntent(paymentId: string): PaymentProductionRecord {
  assertPaymentProductionSafety();
  const record = requireRecord(paymentId);
  const adapter = getPaymentProviderAdapter(record.providerId)!;

  const result = adapter.authorizePayment(paymentId, record);
  if (result.riskOutcome === "DECLINED") {
    return updateRecord(record, "FAILED", { riskOutcome: "DECLINED" });
  }
  if (result.requiresAction || result.state === "REQUIRES_ACTION") {
    return updateRecord(record, "REQUIRES_ACTION", { riskOutcome: result.riskOutcome ?? "REQUIRES_ACTION" });
  }
  if (!result.ok) {
    return updateRecord(record, "FAILED");
  }

  authorizePayment(
    createPendingPayment({
      orderId: record.orderId,
      amount: record.amount,
      currency: record.currency,
      provider: record.providerId.toLowerCase(),
    }),
  );
  return updateRecord(record, result.state ?? "AUTHORIZED", { riskOutcome: result.riskOutcome ?? "APPROVED" });
}

export function capturePaymentIntent(input: PaymentCaptureInput): PaymentProductionRecord {
  assertPaymentProductionSafety();
  const record = requireRecord(input.paymentId);

  if (record.captureAttempted && record.state === "UNKNOWN") {
    throw new Error("UNKNOWN_PAYMENT_NO_AUTO_RETRY");
  }

  const safety = assertPaymentCaptureSafety({
    orderId: input.orderId,
    paymentId: input.paymentId,
    amount: input.amount,
    currency: input.currency,
    recordAmount: record.amount,
    recordCurrency: record.currency,
    recordOrderId: record.orderId,
  });
  if (!safety.ok) {
    return updateRecord(record, "PAYMENT_BLOCKED");
  }

  if (!checkCaptureIdempotency(`capture_${input.idempotencyKey}`)) {
    return record;
  }

  if (record.state === "CAPTURED") {
    return record;
  }

  if (record.state !== "AUTHORIZED" && record.state !== "REQUIRES_ACTION") {
    throw new Error("PAYMENT_NOT_AUTHORIZED");
  }

  const adapter = getPaymentProviderAdapter(record.providerId)!;
  const result = adapter.capturePayment(input, record);

  if (result.state === "PAYMENT_BLOCKED" || !result.ok) {
    return updateRecord(record, "PAYMENT_BLOCKED", { captureAttempted: true });
  }

  capturePayment(
    createPendingPayment({
      orderId: record.orderId,
      amount: record.amount,
      currency: record.currency,
    }),
  );
  return updateRecord(record, result.state ?? "CAPTURED", { captureAttempted: true });
}

export function cancelPaymentIntent(paymentId: string): PaymentProductionRecord {
  assertPaymentProductionSafety();
  const record = requireRecord(paymentId);
  const adapter = getPaymentProviderAdapter(record.providerId)!;
  adapter.cancelPayment(paymentId, record);
  cancelPayment(
    createPendingPayment({
      orderId: record.orderId,
      amount: record.amount,
      currency: record.currency,
    }),
  );
  return updateRecord(record, "CANCELLED");
}

export function markUnknownPaymentState(paymentId: string): PaymentProductionRecord {
  const record = requireRecord(paymentId);
  return updateRecord(record, "UNKNOWN", { captureAttempted: true });
}

export function buildPaymentIdempotencyKey(orderId: string): string {
  return `pay350_${orderId}_${randomUUID().slice(0, 8)}`;
}

function requireRecord(paymentId: string): PaymentProductionRecord {
  const record = getPaymentProductionRecord(paymentId);
  if (!record) throw new Error("PAYMENT_NOT_FOUND");
  return record;
}

const idempotencyIndex = new Map<string, string>();

function findRecordByIdempotencyKey(key: string): PaymentProductionRecord | undefined {
  const paymentId = idempotencyIndex.get(key);
  if (paymentId) return getPaymentProductionRecord(paymentId);
  return undefined;
}

export function resetPaymentFlowForTests(): void {
  idempotencyIndex.clear();
}

function updateRecord(
  record: PaymentProductionRecord,
  state: PaymentProductionState,
  extra: Partial<PaymentProductionRecord> = {},
): PaymentProductionRecord {
  const updated = updatePaymentProductionState(record.paymentId, state, extra);
  return updated ?? { ...record, state, ...extra, updatedAt: new Date().toISOString() };
}
