import { getPaymentCapabilitiesForRegion } from "@/lib/market-engine/payment";
import { getMarket } from "@/lib/market-engine/registry";
import {
  BasePaymentProvider,
  capabilityNotSupported,
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

/** PayPal — primary provider; Pay Later eligibility is provider-side only. */
export class PayPalProvider extends BasePaymentProvider {
  kind = "PAYPAL" as const;
  category = "WALLET" as const;

  availability(ctx: ProviderAvailabilityContext): ProviderOperationResult<{ available: boolean }> {
    const status = resolveProviderConfigStatus("PAYPAL");
    if (status === "DISABLED" || status === "NOT_CONFIGURED") {
      return { ok: true, data: { available: false } };
    }
    const market = getMarket(ctx.country);
    const region = market?.paymentRegion ?? "EU";
    const caps = getPaymentCapabilitiesForRegion(region);
    const available = this.isAvailableInContext(ctx) && caps.includes("paypal");
    return { ok: true, data: { available } };
  }

  createPayment(input: PaymentCreateInput): ProviderOperationResult {
    const avail = this.availability({
      country: "DE",
      currency: input.currency,
      amount: input.amount,
    });
    if (!avail.data?.available) return { ok: false, error: "PAYPAL_UNAVAILABLE" };
    return createMockProviderResult("CREATED", {
      providerToken: `paypal_token_${input.orderId}`,
      redirectUrl: this.dryRun() ? undefined : `https://paypal.com/checkout/${input.orderId}`,
    });
  }

  authorizePayment(_paymentId: string, record: PaymentProductionRecord): ProviderOperationResult {
    if (record.state === "FAILED") return { ok: false, state: "FAILED", error: "PAYMENT_FAILED" };
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
    if (payload.eventType === "PAYMENT.CAPTURE.COMPLETED") {
      return createMockProviderResult("CAPTURED");
    }
    if (payload.eventType === "PAYMENT.CAPTURE.DENIED") {
      return createMockProviderResult("FAILED");
    }
    return capabilityNotSupported();
  }
}

export const paypalProvider = new PayPalProvider();
