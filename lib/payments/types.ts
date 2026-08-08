export type PaymentProviderId = "paypal" | "stripe" | "klarna" | "sepa";

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
