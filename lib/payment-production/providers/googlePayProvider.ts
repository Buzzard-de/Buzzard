import {
  BasePaymentProvider,
  createMockProviderResult,
  resolveProviderConfigStatus,
} from "./baseProvider";
import type {
  PaymentCaptureInput,
  PaymentCreateInput,
  PaymentProductionRecord,
  PaymentRefundInput,
  PaymentWebhookPayload,
  ProviderAvailabilityContext,
  ProviderOperationResult,
} from "../types";

/** Google Pay — dynamic availability by device/browser/country/provider. */
export class GooglePayProvider extends BasePaymentProvider {
  kind = "GOOGLE_PAY" as const;
  category = "WALLET" as const;

  availability(ctx: ProviderAvailabilityContext): ProviderOperationResult<{ available: boolean }> {
    const status = resolveProviderConfigStatus("GOOGLE_PAY");
    if (status === "DISABLED" || status === "NOT_CONFIGURED") {
      return { ok: true, data: { available: false } };
    }
    const deviceOk = ctx.deviceSupportsGooglePay !== false;
    return { ok: true, data: { available: this.isAvailableInContext(ctx) && deviceOk } };
  }

  createPayment(input: PaymentCreateInput): ProviderOperationResult {
    return createMockProviderResult("CREATED", { providerToken: `google_pay_${input.orderId}` });
  }

  authorizePayment(): ProviderOperationResult {
    return createMockProviderResult("AUTHORIZED", { riskOutcome: "APPROVED" });
  }

  capturePayment(input: PaymentCaptureInput, record: PaymentProductionRecord): ProviderOperationResult {
    if (record.amount !== input.amount || record.currency !== input.currency) {
      return { ok: false, state: "PAYMENT_BLOCKED", error: "AMOUNT_OR_CURRENCY_MISMATCH" };
    }
    return createMockProviderResult("CAPTURED");
  }

  cancelPayment(_paymentId: string, _record: PaymentProductionRecord): ProviderOperationResult {
    return createMockProviderResult("CANCELLED");
  }

  refundPayment(input: PaymentRefundInput, record: PaymentProductionRecord): ProviderOperationResult {
    const full = !input.amount || input.amount >= record.amount;
    return createMockProviderResult(full ? "REFUNDED" : "PARTIALLY_REFUNDED");
  }

  getPaymentStatus(_paymentId: string, record: PaymentProductionRecord): ProviderOperationResult {
    return { ok: true, state: record.state };
  }

  handleWebhook(): ProviderOperationResult {
    return { ok: false, error: "CAPABILITY_NOT_SUPPORTED", capabilityNotSupported: true };
  }
}

export const googlePayProvider = new GooglePayProvider();
