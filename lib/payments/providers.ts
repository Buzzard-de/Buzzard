import type { PaymentProvider, PaymentProviderId, PaymentRequest, PaymentResult } from "./types";

function mockProvider(
  id: PaymentProviderId,
  labelKey: string,
  descriptionKey: string
): PaymentProvider {
  return {
    id,
    labelKey,
    descriptionKey,
    supportsGuest: true,
    async process(request: PaymentRequest): Promise<PaymentResult> {
      if (request.amount <= 0) {
        return { success: false, provider: id, status: "failed", errorKey: "checkout.paymentFailed" };
      }
      return {
        success: true,
        provider: id,
        status: "paid",
        transactionId: `${id.toUpperCase()}-${request.orderNumber}`,
      };
    },
  };
}

const providers: PaymentProvider[] = [
  mockProvider("paypal", "checkout.payPaypal", "checkout.payPaypalDesc"),
  mockProvider("stripe", "checkout.payStripe", "checkout.payStripeDesc"),
  mockProvider("klarna", "checkout.payKlarna", "checkout.payKlarnaDesc"),
  mockProvider("sepa", "checkout.paySepa", "checkout.paySepaDesc"),
];

export function getPaymentProvider(id: PaymentProviderId): PaymentProvider | undefined {
  return providers.find((p) => p.id === id);
}

export function listPaymentProviders(): PaymentProvider[] {
  return providers;
}

export async function processPayment(
  providerId: PaymentProviderId,
  request: PaymentRequest
): Promise<PaymentResult> {
  const provider = getPaymentProvider(providerId);
  if (!provider) {
    return {
      success: false,
      provider: providerId,
      status: "failed",
      errorKey: "checkout.errorPayment",
    };
  }
  return provider.process(request);
}

export type { PaymentProvider, PaymentProviderId, PaymentRequest, PaymentResult };
