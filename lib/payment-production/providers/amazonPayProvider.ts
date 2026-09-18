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

/** Amazon Pay — separate provider; uses Amazon-supported methods only. */
export class AmazonPayProvider extends BasePaymentProvider {
  kind = "AMAZON_PAY" as const;
  category = "WALLET" as const;

  availability(ctx: ProviderAvailabilityContext): ProviderOperationResult<{ available: boolean }> {
    const status = resolveProviderConfigStatus("AMAZON_PAY");
    if (status === "DISABLED" || status === "NOT_CONFIGURED") {
      return { ok: true, data: { available: false } };
    }
    const supportedCountries = new Set(["DE", "FR", "IT", "ES", "UK", "GB", "US", "JP", "NL", "BE"]);
    return {
      ok: true,
      data: {
        available:
          this.isAvailableInContext(ctx) && supportedCountries.has(ctx.country.toUpperCase()),
      },
    };
  }

  createPayment(input: PaymentCreateInput): ProviderOperationResult {
    return createMockProviderResult("CREATED", {
      providerToken: `amazon_pay_${input.orderId}`,
      redirectUrl: this.dryRun() ? undefined : `https://pay.amazon.com/checkout/${input.orderId}`,
    });
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

  handleWebhook(payload: PaymentWebhookPayload): ProviderOperationResult {
    if (payload.eventType === "ChargePermission") {
      return createMockProviderResult("CAPTURED");
    }
    return { ok: false, error: "CAPABILITY_NOT_SUPPORTED", capabilityNotSupported: true };
  }
}

export const amazonPayProvider = new AmazonPayProvider();
