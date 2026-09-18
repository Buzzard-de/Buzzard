import { getPaymentCapabilitiesForRegion } from "@/lib/market-engine/payment";
import { getMarket } from "@/lib/market-engine/registry";
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

/** Klarna BNPL — PAY_LATER / INSTALLMENTS / INVOICE only when provider offers them. */
export class KlarnaProvider extends BasePaymentProvider {
  kind = "KLARNA" as const;
  category = "BNPL" as const;

  availability(ctx: ProviderAvailabilityContext): ProviderOperationResult<{ available: boolean }> {
    const status = resolveProviderConfigStatus("KLARNA");
    if (status === "DISABLED" || status === "NOT_CONFIGURED") {
      return { ok: true, data: { available: false } };
    }
    const market = getMarket(ctx.country);
    const region = market?.paymentRegion ?? "EU";
    const caps = getPaymentCapabilitiesForRegion(region);
    const klarnaCountries = new Set(["DE", "AT", "NL", "BE", "SE", "FI", "NO", "DK", "FR", "IT", "ES", "PL"]);
    return {
      ok: true,
      data: {
        available:
          this.isAvailableInContext(ctx) &&
          caps.includes("klarna") &&
          klarnaCountries.has(ctx.country.toUpperCase()) &&
          ctx.amount >= 10 &&
          ctx.amount <= 5000,
      },
    };
  }

  createPayment(input: PaymentCreateInput): ProviderOperationResult {
    return createMockProviderResult("CREATED", {
      providerToken: `klarna_${input.orderId}`,
      redirectUrl: this.dryRun() ? undefined : `https://klarna.com/checkout/${input.orderId}`,
    });
  }

  authorizePayment(): ProviderOperationResult {
    return createMockProviderResult("AUTHORIZED", { riskOutcome: "APPROVED" });
  }

  capturePayment(input: PaymentCaptureInput, record: PaymentProductionRecord): ProviderOperationResult {
    if (record.amount !== input.amount) {
      return { ok: false, state: "PAYMENT_BLOCKED", error: "AMOUNT_MISMATCH" };
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
    if (payload.eventType === "AUTHORIZED") return createMockProviderResult("AUTHORIZED");
    if (payload.eventType === "CAPTURED") return createMockProviderResult("CAPTURED");
    return { ok: false, error: "CAPABILITY_NOT_SUPPORTED", capabilityNotSupported: true };
  }
}

export const klarnaProvider = new KlarnaProvider();
