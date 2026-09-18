import type { CheckoutPaymentMethod, PaymentMethodsQuery } from "./types";

export async function fetchCheckoutPaymentMethods(
  query: PaymentMethodsQuery,
): Promise<CheckoutPaymentMethod[]> {
  const params = new URLSearchParams({
    country: query.country,
    currency: query.currency,
    amount: String(query.amount),
  });
  if (query.customerType) params.set("customerType", query.customerType);
  if (query.market) params.set("market", query.market);
  if (query.deviceSupportsApplePay === false) params.set("deviceSupportsApplePay", "0");
  if (query.deviceSupportsGooglePay === false) params.set("deviceSupportsGooglePay", "0");

  const res = await fetch(`/api/payment/methods?${params.toString()}`);
  if (!res.ok) return [];
  const data = (await res.json()) as { methods?: CheckoutPaymentMethod[] };
  return data.methods ?? [];
}
