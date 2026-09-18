import { getCheckoutPaymentMethods } from "@/lib/payment-production/methods";
import type { PaymentProvider, PaymentProviderId, PaymentRequest, PaymentResult } from "./types";

function mockProvider(
  id: PaymentProviderId,
  labelKey: string,
  descriptionKey: string,
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

const legacyProviders: PaymentProvider[] = [
  mockProvider("paypal", "checkout.payPaypal", "checkout.payPaypalDesc"),
  mockProvider("stripe", "checkout.payStripe", "checkout.payStripeDesc"),
  mockProvider("klarna", "checkout.payKlarna", "checkout.payKlarnaDesc"),
  mockProvider("sepa", "checkout.paySepa", "checkout.paySepaDesc"),
];

/** Bridge storefront checkout to payment-production method matrix when context available. */
export function listPaymentProvidersForCheckout(input?: {
  country?: string;
  currency?: string;
  amount?: number;
}): PaymentProvider[] {
  if (input?.country && input.currency && input.amount != null) {
    const methods = getCheckoutPaymentMethods({
      country: input.country,
      currency: input.currency,
      amount: input.amount,
    });
    if (methods.length > 0) {
      return methods.map((m) => ({
        id: m.id as PaymentProviderId,
        labelKey: m.labelKey,
        descriptionKey: m.descriptionKey ?? m.labelKey,
        supportsGuest: true,
        async process(request: PaymentRequest): Promise<PaymentResult> {
          if (request.amount <= 0) {
            return { success: false, provider: m.id as PaymentProviderId, status: "failed" };
          }
          return {
            success: true,
            provider: m.id as PaymentProviderId,
            status: "paid",
            transactionId: `${m.provider}-${request.orderNumber}`,
          };
        },
      }));
    }
  }
  return legacyProviders;
}

export function listPaymentProviders(): PaymentProvider[] {
  return listPaymentProvidersForCheckout({ country: "DE", currency: "EUR", amount: 1 });
}

export function getPaymentProvider(id: PaymentProviderId): PaymentProvider | undefined {
  return listPaymentProviders().find((p) => p.id === id);
}

export async function processPayment(
  providerId: PaymentProviderId,
  request: PaymentRequest,
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
