export type PaymentProviderId =
  | "paypal"
  | "stripe"
  | "klarna"
  | "sepa"
  | "card"
  | "apple_pay"
  | "google_pay"
  | "amazon_pay"
  | "local_ideal"
  | "local_giropay"
  | "paypal_pay_later"
  | string;

export type PaymentStatus = "pending" | "authorized" | "paid" | "failed" | "cancelled";

export interface PaymentRequest {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  customerEmail: string;
  returnUrl: string;
}

export interface PaymentResult {
  success: boolean;
  provider: PaymentProviderId;
  status: PaymentStatus;
  transactionId?: string;
  redirectUrl?: string;
  errorKey?: string;
}

export interface PaymentProvider {
  id: PaymentProviderId;
  labelKey: string;
  descriptionKey: string;
  supportsGuest: boolean;
  process(request: PaymentRequest): Promise<PaymentResult>;
}
