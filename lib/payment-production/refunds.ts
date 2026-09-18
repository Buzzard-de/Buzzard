import { getPaymentProviderAdapter } from "./providers/registry";
import { checkIdempotencyKey } from "./idempotency";
import { assertPaymentProductionSafety } from "./safety";
import { getPaymentProductionRecord, updatePaymentProductionState } from "./persistence";
import type { PaymentRefundInput, RefundType } from "./types";

/** Refunds via provider — customer refund separate from supplier recovery (Returns Engine). */
export function processPaymentRefund(
  input: PaymentRefundInput,
  refundType: RefundType = "FULL_REFUND",
): { ok: boolean; state?: string; error?: string } {
  assertPaymentProductionSafety();

  if (!checkIdempotencyKey(`refund_${input.idempotencyKey}`)) {
    return { ok: false, error: "DUPLICATE_REFUND" };
  }

  const record = getPaymentProductionRecord(input.paymentId);
  if (!record) return { ok: false, error: "PAYMENT_NOT_FOUND" };
  if (record.state !== "CAPTURED" && record.state !== "PARTIALLY_REFUNDED") {
    return { ok: false, error: "PAYMENT_NOT_REFUNDABLE" };
  }

  const adapter = getPaymentProviderAdapter(record.providerId);
  if (!adapter) return { ok: false, error: "PROVIDER_NOT_FOUND" };

  const amount =
    refundType === "FULL_REFUND" || refundType === "CANCEL"
      ? record.amount
      : input.amount ?? record.amount;

  const result = adapter.refundPayment({ ...input, amount }, record);
  if (result.capabilityNotSupported) {
    return { ok: false, error: "CAPABILITY_NOT_SUPPORTED" };
  }
  if (!result.ok) return { ok: false, error: result.error };

  const newState = result.state ?? (amount >= record.amount ? "REFUNDED" : "PARTIALLY_REFUNDED");
  updatePaymentProductionState(input.paymentId, newState);
  return { ok: true, state: newState };
}
