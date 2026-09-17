import { randomUUID } from "crypto";
import {
  authorizePayment,
  capturePayment,
  cancelPayment,
  createPendingPayment,
} from "@/lib/order-engine/payment";
import { getDefaultPaymentProviderId, isPaymentProductionEnabled } from "./config";
import { assertPaymentProductionSafety } from "./safety";
import { savePaymentProductionRecord, getPaymentProductionRecord } from "./persistence";
import type { PaymentProductionRecord, PaymentProductionState } from "./types";

export function createPaymentIntent(input: {
  orderId: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
}): PaymentProductionRecord {
  assertPaymentProductionSafety();
  const providerId = getDefaultPaymentProviderId();
  const payment = createPendingPayment({
    orderId: input.orderId,
    amount: input.amount,
    currency: input.currency,
    provider: providerId,
  });
  const record: PaymentProductionRecord = {
    paymentId: payment.paymentId,
    orderId: input.orderId,
    providerId,
    amount: input.amount,
    currency: input.currency,
    state: "PENDING",
    idempotencyKey: input.idempotencyKey,
    dryRun: !isPaymentProductionEnabled(),
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
  savePaymentProductionRecord(record);
  return record;
}

export function authorizePaymentIntent(paymentId: string): PaymentProductionRecord {
  assertPaymentProductionSafety();
  const record = requireRecord(paymentId);
  const auth = authorizePayment(
    createPendingPayment({
      orderId: record.orderId,
      amount: record.amount,
      currency: record.currency,
      provider: record.providerId,
    }),
  );
  return updateState(record, auth.ok ? "AUTHORIZED" : "FAILED");
}

export function capturePaymentIntent(paymentId: string): PaymentProductionRecord {
  assertPaymentProductionSafety();
  const record = requireRecord(paymentId);
  if (record.state !== "AUTHORIZED") throw new Error("PAYMENT_NOT_AUTHORIZED");
  return updateState(record, "CAPTURED");
}

export function cancelPaymentIntent(paymentId: string): PaymentProductionRecord {
  assertPaymentProductionSafety();
  const record = requireRecord(paymentId);
  cancelPayment(
    createPendingPayment({
      orderId: record.orderId,
      amount: record.amount,
      currency: record.currency,
    }),
  );
  return updateState(record, "CANCELLED");
}

export function markUnknownPaymentState(paymentId: string): PaymentProductionRecord {
  return updateState(requireRecord(paymentId), "UNKNOWN_PAYMENT_STATE");
}

export function verifyPaymentWebhookSignature(_payload: string, _signature: string): boolean {
  return false;
}

function requireRecord(paymentId: string): PaymentProductionRecord {
  const record = getPaymentProductionRecord(paymentId);
  if (!record) throw new Error("PAYMENT_NOT_FOUND");
  return record;
}

function updateState(record: PaymentProductionRecord, state: PaymentProductionState): PaymentProductionRecord {
  const updated = { ...record, state, updatedAt: new Date().toISOString() };
  savePaymentProductionRecord(updated);
  return updated;
}

export function buildPaymentIdempotencyKey(orderId: string): string {
  return `pay350_${orderId}_${randomUUID().slice(0, 8)}`;
}
