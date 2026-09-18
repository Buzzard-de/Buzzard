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

/** SEPA Direct Debit — mandate managed by provider; IBAN not stored in Buzzard DB. */
export class SepaProvider extends BasePaymentProvider {
  kind = "SEPA" as const;
  category = "SEPA" as const;

  availability(ctx: ProviderAvailabilityContext): ProviderOperationResult<{ available: boolean }> {
    const status = resolveProviderConfigStatus("SEPA");
    if (status === "DISABLED" || status === "NOT_CONFIGURED") {
      return { ok: true, data: { available: false } };
    }
    const market = getMarket(ctx.country);
    const region = market?.paymentRegion ?? "EU";
    const caps = getPaymentCapabilitiesForRegion(region);
    const sepaCountries = new Set(["DE", "AT", "NL", "BE", "FR", "IT", "ES", "FI", "IE", "LU", "PT"]);
    return {
      ok: true,
      data: {
        available:
          this.isAvailableInContext(ctx) &&
          caps.includes("sepa") &&
          sepaCountries.has(ctx.country.toUpperCase()) &&
          ctx.currency === "EUR",
      },
    };
  }

  createPayment(input: PaymentCreateInput): ProviderOperationResult {
    return createMockProviderResult("PENDING", {
      providerToken: `sepa_mandate_ref_${input.orderId}`,
    });
  }

  authorizePayment(): ProviderOperationResult {
    return createMockProviderResult("PENDING");
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

  refundPayment(): ProviderOperationResult {
    return { ok: false, error: "CAPABILITY_NOT_SUPPORTED", capabilityNotSupported: true };
  }

  getPaymentStatus(_paymentId: string, record: PaymentProductionRecord): ProviderOperationResult {
    return { ok: true, state: record.state };
  }

  handleWebhook(payload: PaymentWebhookPayload): ProviderOperationResult {
    switch (payload.eventType) {
      case "MANDATE_CREATED":
        return createMockProviderResult("CREATED");
      case "PAYMENT_PENDING":
        return createMockProviderResult("PENDING");
      case "PAYMENT_CONFIRMED":
        return createMockProviderResult("CAPTURED");
      case "PAYMENT_FAILED":
        return createMockProviderResult("FAILED");
      case "CHARGEBACK":
        return createMockProviderResult("REFUNDED");
      default:
        return { ok: false, error: "CAPABILITY_NOT_SUPPORTED", capabilityNotSupported: true };
    }
  }
}

export const sepaProvider = new SepaProvider();
