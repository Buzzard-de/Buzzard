import type { PaymentProviderId } from "@/lib/payments/types";

export interface PaymentSessionRequest {
  orderId: string;
  amount: number;
  currency: string;
  provider?: PaymentProviderId;
}

export interface PaymentSessionResult {
  provider: string;
  orderId: string;
  amount: number;
  currency: string;
  status: "requires_confirmation" | "paid" | "failed";
  checkoutUrl: string;
}

/** Production adapter boundary — replace mock with Stripe/PayPal/Klarna server routes. */
export async function createPaymentSession(
  request: PaymentSessionRequest
): Promise<PaymentSessionResult> {
  return {
    provider: request.provider?.toUpperCase() ?? "MOCK",
    orderId: request.orderId,
    amount: request.amount,
    currency: request.currency,
    status: "requires_confirmation",
    checkoutUrl: "#payment",
  };
}
