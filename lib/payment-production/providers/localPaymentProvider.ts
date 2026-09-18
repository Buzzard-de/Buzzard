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

const LOCAL_METHODS: Record<string, { id: string; labelKey: string }[]> = {
  NL: [{ id: "ideal", labelKey: "checkout.payIdeal" }],
  DE: [{ id: "giropay", labelKey: "checkout.payGiropay" }],
  BE: [{ id: "bancontact", labelKey: "checkout.payBancontact" }],
  PL: [{ id: "blik", labelKey: "checkout.payBlik" }],
  TR: [{ id: "local_tr", labelKey: "checkout.payLocalTr" }],
};

/** Local payment methods — resolved via Market Engine, not hardcoded for all 35 markets. */
export class LocalPaymentProvider extends BasePaymentProvider {
  kind = "LOCAL_PAYMENT" as const;
  category = "LOCAL_PAYMENT" as const;

  availability(ctx: ProviderAvailabilityContext): ProviderOperationResult<{ available: boolean }> {
    const status = resolveProviderConfigStatus("LOCAL_PAYMENT");
    if (status === "DISABLED" || status === "NOT_CONFIGURED") {
      return { ok: true, data: { available: false } };
    }
    const country = ctx.country.toUpperCase();
    const hasLocal = Boolean(LOCAL_METHODS[country]);
    const market = getMarket(country);
    const paymentEnabled = market?.featureFlags.paymentEnabled;
    if (paymentEnabled === false) return { ok: true, data: { available: false } };
    return { ok: true, data: { available: this.isAvailableInContext(ctx) && hasLocal } };
  }

  listLocalMethods(country: string): { id: string; labelKey: string }[] {
    return LOCAL_METHODS[country.toUpperCase()] ?? [];
  }

  createPayment(input: PaymentCreateInput): ProviderOperationResult {
    return createMockProviderResult("CREATED", {
      providerToken: `local_${input.orderId}`,
      redirectUrl: `#local-payment-${input.orderId}`,
    });
  }

  authorizePayment(): ProviderOperationResult {
    return createMockProviderResult("AUTHORIZED");
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
    if (payload.eventType === "PAYMENT_CONFIRMED") return createMockProviderResult("CAPTURED");
    if (payload.eventType === "PAYMENT_FAILED") return createMockProviderResult("FAILED");
    return { ok: false, error: "CAPABILITY_NOT_SUPPORTED", capabilityNotSupported: true };
  }
}

export const localPaymentProvider = new LocalPaymentProvider();
