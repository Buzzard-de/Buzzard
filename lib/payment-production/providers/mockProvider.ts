import {
  BasePaymentProvider,
  createMockProviderResult,
} from "./baseProvider";
import type {
  PaymentCaptureInput,
  PaymentCreateInput,
  PaymentProductionRecord,
  PaymentRefundInput,
  PaymentWebhookPayload,
  ProviderAvailabilityContext,
  ProviderConfigStatus,
  ProviderOperationResult,
} from "../types";

/** Mock/sandbox provider for tests — never counts as production evidence. */
export class MockPaymentProvider extends BasePaymentProvider {
  kind = "MOCK" as const;
  category = "CARD" as const;

  configStatus(): ProviderConfigStatus {
    return "VALIDATED";
  }

  availability(ctx: ProviderAvailabilityContext): ProviderOperationResult<{ available: boolean }> {
    return { ok: true, data: { available: ctx.amount > 0 } };
  }

  createPayment(input: PaymentCreateInput): ProviderOperationResult {
    return createMockProviderResult("CREATED", { providerToken: `mock_${input.orderId}` });
  }

  authorizePayment(_paymentId: string, record: PaymentProductionRecord): ProviderOperationResult {
    if (record.state === "FAILED") return { ok: false, state: "FAILED" };
    return createMockProviderResult("AUTHORIZED");
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
    return createMockProviderResult("CAPTURED");
  }
}

export const mockProvider = new MockPaymentProvider();
