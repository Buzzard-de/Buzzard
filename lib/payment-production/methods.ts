import type { CheckoutPaymentMethod, PaymentMethodsQuery } from "./types";
import { routePaymentMethods } from "./router";

export function getCheckoutPaymentMethods(query: PaymentMethodsQuery): CheckoutPaymentMethod[] {
  if (!query.country || !query.currency || query.amount == null) {
    return [];
  }
  return routePaymentMethods(query).filter((m) => m.available);
}
