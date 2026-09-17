export type PaymentProviderId = "mock" | "stripe" | "adyen" | "paypal";

export type PaymentProductionState =
  | "PENDING"
  | "AUTHORIZED"
  | "CAPTURED"
  | "CANCELLED"
  | "FAILED"
  | "UNKNOWN_PAYMENT_STATE"
  | "REFUND_PENDING"
  | "REFUNDED";

export interface PaymentProviderConfig {
  providerId: PaymentProviderId;
  secretRef: string;
  environment: "SANDBOX" | "PRODUCTION";
  webhookSecretRef?: string;
}

export interface PaymentProductionRecord {
  paymentId: string;
  orderId: string;
  providerId: PaymentProviderId;
  amount: number;
  currency: string;
  state: PaymentProductionState;
  idempotencyKey: string;
  dryRun: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentProductionDashboard {
  version: string;
  productionEnabled: "DISABLED" | "ENABLED" | "BLOCKED";
  liveStatus: "BLOCKED" | "NOT_CONFIGURED" | "UNVERIFIED";
  defaultProvider: PaymentProviderId;
  safetyCounters: { realCharges: number; realRefunds: number };
  blockers: string[];
}
