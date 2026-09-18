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

/** Tokenized card payments — Visa/MC/Amex via provider-hosted checkout; 3DS/SCA supported. */
export class CardProvider extends BasePaymentProvider {
  kind = "CARD" as const;
  category = "CARD" as const;

  availability(ctx: ProviderAvailabilityContext): ProviderOperationResult<{ available: boolean }> {
    const status = resolveProviderConfigStatus("CARD");
    if (status === "DISABLED" || status === "NOT_CONFIGURED") {
      return { ok: true, data: { available: false } };
    }
    const market = getMarket(ctx.country);
    const region = market?.paymentRegion ?? "EU";
    const caps = getPaymentCapabilitiesForRegion(region);
    return { ok: true, data: { available: this.isAvailableInContext(ctx) && caps.includes("card") } };
  }

  createPayment(input: PaymentCreateInput): ProviderOperationResult {
    return createMockProviderResult("CREATED", {
      providerToken: `card_token_${input.orderId}`,
      requiresAction: input.amount > 500,
    });
  }

  authorizePayment(_paymentId: string, record: PaymentProductionRecord): ProviderOperationResult {
    if (record.state === "FAILED") return { ok: false, state: "FAILED" };
    if (record.amount > 500) {
      return createMockProviderResult("REQUIRES_ACTION", { requiresAction: true, riskOutcome: "REQUIRES_ACTION" });
    }
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
    if (payload.eventType === "3DS_REQUIRED") {
      return createMockProviderResult("REQUIRES_ACTION", { requiresAction: true });
    }
    if (payload.eventType === "payment_intent.succeeded") {
      return createMockProviderResult("CAPTURED");
    }
    return capabilityNotSupported();
  }
}

export const cardProvider = new CardProvider();
