import { getMarket } from "@/lib/market-engine/registry";
import { getDefaultPaymentProviderKind } from "./config";
import { listPaymentProviderAdapters } from "./providers/registry";
import type {
  CheckoutPaymentMethod,
  PaymentMethodsQuery,
  PaymentProviderKind,
  ProviderAvailabilityContext,
} from "./types";
import { localPaymentProvider } from "./providers/localPaymentProvider";

const METHOD_LABELS: Record<PaymentProviderKind, { labelKey: string; descriptionKey: string }> = {
  PAYPAL: { labelKey: "checkout.payPaypal", descriptionKey: "checkout.payPaypalDesc" },
  CARD: { labelKey: "checkout.payStripe", descriptionKey: "checkout.payStripeDesc" },
  SEPA: { labelKey: "checkout.paySepa", descriptionKey: "checkout.paySepaDesc" },
  APPLE_PAY: { labelKey: "checkout.payApplePay", descriptionKey: "checkout.payApplePayDesc" },
  GOOGLE_PAY: { labelKey: "checkout.payGooglePay", descriptionKey: "checkout.payGooglePayDesc" },
  AMAZON_PAY: { labelKey: "checkout.payAmazonPay", descriptionKey: "checkout.payAmazonPayDesc" },
  KLARNA: { labelKey: "checkout.payKlarna", descriptionKey: "checkout.payKlarnaDesc" },
  LOCAL_PAYMENT: { labelKey: "checkout.payLocal", descriptionKey: "checkout.payLocalDesc" },
  MOCK: { labelKey: "checkout.payMock", descriptionKey: "checkout.payMockDesc" },
};

function toAvailabilityContext(query: PaymentMethodsQuery): ProviderAvailabilityContext {
  const market = getMarket(query.country);
  return {
    country: query.country,
    currency: query.currency,
    amount: query.amount,
    customerType: query.customerType,
    market: query.market ?? market?.countryCode,
    deviceSupportsApplePay: query.deviceSupportsApplePay,
    deviceSupportsGooglePay: query.deviceSupportsGooglePay,
  };
}

/** Payment router — availability from provider + market config, not hardcoded per country. */
export function routePaymentMethods(query: PaymentMethodsQuery): CheckoutPaymentMethod[] {
  const ctx = toAvailabilityContext(query);
  const methods: CheckoutPaymentMethod[] = [];
  const fallbackOrder: PaymentProviderKind[] = ["CARD", "PAYPAL", "MOCK"];

  for (const adapter of listPaymentProviderAdapters()) {
    if (adapter.kind === "MOCK" && process.env.NODE_ENV === "production") continue;

    const avail = adapter.availability(ctx);
    if (!avail.data?.available) continue;

    const labels = METHOD_LABELS[adapter.kind];
    methods.push({
      id: adapter.kind.toLowerCase(),
      provider: adapter.kind,
      category: adapter.category,
      labelKey: labels.labelKey,
      descriptionKey: labels.descriptionKey,
      available: true,
      providerDecidesEligibility: adapter.category === "BNPL" || adapter.kind === "PAYPAL",
    });

    if (adapter.kind === "PAYPAL") {
      methods.push({
        id: "paypal_pay_later",
        provider: "PAYPAL",
        category: "BNPL",
        labelKey: "checkout.payPayLater",
        descriptionKey: "checkout.payPayLaterDesc",
        bnplVariant: "PAY_LATER",
        providerDecidesEligibility: true,
        available: true,
      });
    }

    if (adapter.kind === "KLARNA") {
      for (const variant of ["PAY_LATER", "INSTALLMENTS", "INVOICE"] as const) {
        methods.push({
          id: `klarna_${variant.toLowerCase()}`,
          provider: "KLARNA",
          category: "BNPL",
          labelKey: `checkout.klarna.${variant.toLowerCase()}`,
          bnplVariant: variant,
          providerDecidesEligibility: true,
          available: true,
        });
      }
    }

    if (adapter.kind === "LOCAL_PAYMENT") {
      for (const local of localPaymentProvider.listLocalMethods(query.country)) {
        methods.push({
          id: `local_${local.id}`,
          provider: "LOCAL_PAYMENT",
          category: "LOCAL_PAYMENT",
          labelKey: local.labelKey,
          available: true,
        });
      }
    }
  }

  for (const method of methods) {
    const fallback = fallbackOrder.find(
      (kind) => kind !== method.provider && methods.some((m) => m.provider === kind && m.available),
    );
    if (fallback) method.fallbackProvider = fallback;
  }

  return methods;
}

export function selectProviderForMethod(
  methodId: string,
  query: PaymentMethodsQuery,
): PaymentProviderKind | undefined {
  const methods = routePaymentMethods(query);
  const match = methods.find((m) => m.id === methodId);
  return match?.provider ?? getDefaultPaymentProviderKind();
}
