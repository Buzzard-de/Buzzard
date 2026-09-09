import { getDefaultPaymentMethod, getDefaultPaymentProvider } from "./registry";
import type { PaymentRecord, PaymentStatus } from "./types";

export interface PaymentAuthorizationInput {
  orderId: string;
  amount: number;
  currency: string;
  method?: string;
  provider?: string;
  /** Test-only simulate failure */
  shouldFail?: boolean;
}

export interface PaymentAuthorizationResult {
  ok: boolean;
  payment?: PaymentRecord;
  errorMessage?: string;
}

export function createPendingPayment(input: PaymentAuthorizationInput): PaymentRecord {
  const now = new Date().toISOString();
  return {
    paymentId: `pay_${input.orderId}_${Date.now()}`,
    orderId: input.orderId,
    provider: input.provider ?? getDefaultPaymentProvider(),
    method: input.method ?? getDefaultPaymentMethod(),
    amount: input.amount,
    currency: input.currency,
    status: "PENDING",
    dryRun: true,
    createdAt: now,
    updatedAt: now,
  };
}

/** Mock/dry-run payment — no real card processing. */
export function authorizePayment(payment: PaymentRecord, shouldFail = false): PaymentAuthorizationResult {
  if (shouldFail) {
    return {
      ok: false,
      payment: { ...payment, status: "FAILED", updatedAt: new Date().toISOString() },
      errorMessage: "PAYMENT_FAILED",
    };
  }

  const authorized: PaymentRecord = {
    ...payment,
    status: "AUTHORIZED",
    updatedAt: new Date().toISOString(),
  };
  return { ok: true, payment: authorized };
}

export function capturePayment(payment: PaymentRecord): PaymentRecord {
  return {
    ...payment,
    status: "CAPTURED",
    updatedAt: new Date().toISOString(),
  };
}

export function cancelPayment(payment: PaymentRecord): PaymentRecord {
  return {
    ...payment,
    status: "CANCELLED",
    updatedAt: new Date().toISOString(),
  };
}

export function mapPaymentStatusToLabel(status: PaymentStatus): string {
  return status;
}
