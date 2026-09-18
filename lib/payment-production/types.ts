/** Multi-provider payment production types — #350 Amazon-level checkout. */

export type PaymentProviderKind =
  | "PAYPAL"
  | "CARD"
  | "SEPA"
  | "APPLE_PAY"
  | "GOOGLE_PAY"
  | "AMAZON_PAY"
  | "KLARNA"
  | "LOCAL_PAYMENT"
  | "MOCK";

/** Legacy alias kept for backward compatibility. */
export type PaymentProviderId = Lowercase<PaymentProviderKind> | "mock" | "stripe" | "adyen" | "paypal";

export type PaymentProductionState =
  | "CREATED"
  | "PENDING"
  | "REQUIRES_ACTION"
  | "AUTHORIZED"
  | "CAPTURED"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"
  | "UNKNOWN"
  | "UNKNOWN_PAYMENT_STATE"
  | "REFUND_PENDING"
  | "PAYMENT_BLOCKED";

export type PaymentMethodCategory =
  | "SEPA"
  | "BANK_TRANSFER"
  | "CARD"
  | "WALLET"
  | "BNPL"
  | "LOCAL_PAYMENT";

export type PaymentBnplVariant = "PAY_LATER" | "INSTALLMENTS" | "INVOICE";

export type PaymentRiskOutcome = "APPROVED" | "DECLINED" | "REQUIRES_ACTION" | "REVIEW" | "UNKNOWN";

export type ProviderConfigStatus =
  | "CONFIGURED"
  | "NOT_CONFIGURED"
  | "VALIDATING"
  | "VALIDATED"
  | "FAILED"
  | "DISABLED"
  | "BLOCKED";

export type PaymentEnvironment = "MOCK" | "SANDBOX" | "PRODUCTION";

export interface PaymentProviderConfig {
  providerId: PaymentProviderKind;
  secretRef: string;
  environment: PaymentEnvironment;
  webhookSecretRef?: string;
  enabled: boolean;
}

export interface PaymentProductionRecord {
  paymentId: string;
  orderId: string;
  providerId: PaymentProviderKind;
  methodCategory: PaymentMethodCategory;
  amount: number;
  currency: string;
  state: PaymentProductionState;
  idempotencyKey: string;
  dryRun: boolean;
  riskOutcome?: PaymentRiskOutcome;
  providerToken?: string;
  captureAttempted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMethodsQuery {
  country: string;
  currency: string;
  amount: number;
  customerType?: "guest" | "registered" | "business";
  market?: string;
  deviceSupportsApplePay?: boolean;
  deviceSupportsGooglePay?: boolean;
}

export interface CheckoutPaymentMethod {
  id: string;
  provider: PaymentProviderKind;
  category: PaymentMethodCategory;
  labelKey: string;
  descriptionKey?: string;
  bnplVariant?: PaymentBnplVariant;
  /** Pay Later / BNPL — eligibility decided by provider, not Buzzard. */
  providerDecidesEligibility?: boolean;
  available: boolean;
  fallbackProvider?: PaymentProviderKind;
}

export interface PaymentCreateInput {
  orderId: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
  provider?: PaymentProviderKind;
  methodCategory?: PaymentMethodCategory;
  customerEmail?: string;
  returnUrl?: string;
}

export interface PaymentCaptureInput {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
}

export interface PaymentWebhookPayload {
  signature: string;
  timestamp: string;
  eventId: string;
  provider: PaymentProviderKind;
  paymentId: string;
  orderId?: string;
  eventType: string;
  rawBody?: string;
}

export type SepaWebhookEvent =
  | "MANDATE_CREATED"
  | "PAYMENT_PENDING"
  | "PAYMENT_CONFIRMED"
  | "PAYMENT_FAILED"
  | "CHARGEBACK";

export interface PaymentRefundInput {
  paymentId: string;
  amount?: number;
  reason?: string;
  idempotencyKey: string;
}

export type RefundType = "FULL_REFUND" | "PARTIAL_REFUND" | "CANCEL";

export interface ProviderAvailabilityContext {
  country: string;
  currency: string;
  amount: number;
  customerType?: string;
  market?: string;
  deviceSupportsApplePay?: boolean;
  deviceSupportsGooglePay?: boolean;
}

export interface ProviderOperationResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  capabilityNotSupported?: boolean;
  requiresAction?: boolean;
  redirectUrl?: string;
  providerToken?: string;
  state?: PaymentProductionState;
  riskOutcome?: PaymentRiskOutcome;
}

export interface PaymentProviderAdapter {
  kind: PaymentProviderKind;
  category: PaymentMethodCategory;
  configStatus(): ProviderConfigStatus;
  availability(ctx: ProviderAvailabilityContext): ProviderOperationResult<{ available: boolean }>;
  createPayment(input: PaymentCreateInput): ProviderOperationResult;
  authorizePayment(paymentId: string, record: PaymentProductionRecord): ProviderOperationResult;
  capturePayment(input: PaymentCaptureInput, record: PaymentProductionRecord): ProviderOperationResult;
  cancelPayment(paymentId: string, record: PaymentProductionRecord): ProviderOperationResult;
  refundPayment(input: PaymentRefundInput, record: PaymentProductionRecord): ProviderOperationResult;
  getPaymentStatus(paymentId: string, record: PaymentProductionRecord): ProviderOperationResult;
  handleWebhook(payload: PaymentWebhookPayload): ProviderOperationResult;
}

export interface PaymentProductionDashboard {
  version: string;
  productionEnabled: "DISABLED" | "ENABLED" | "BLOCKED";
  liveStatus: "BLOCKED" | "NOT_CONFIGURED" | "UNVERIFIED" | "VALIDATED";
  defaultProvider: PaymentProviderKind;
  safetyCounters: {
    realCharges: number;
    realRefunds: number;
    webhookProcessed: number;
    blockedCaptures: number;
  };
  blockers: string[];
  providers: Record<
    PaymentProviderKind,
    {
      status: ProviderConfigStatus;
      enabled: boolean;
      environment: PaymentEnvironment;
    }
  >;
  webhookSecurity: "PASS" | "FAIL";
  idempotency: "PASS" | "FAIL";
  refund: "PASS" | "FAIL";
  fraudRisk: "PASS" | "FAIL";
}

export interface PaymentProductionStatusReport {
  generatedAt: string;
  software: "COMPLETE";
  payment: "PASS" | "NOT_CONFIGURED" | "BLOCKED";
  sales: "OPEN" | "CLOSED";
  realPaymentSideEffects: number;
  sections: Record<string, ProviderConfigStatus | "PASS" | "FAIL">;
}
