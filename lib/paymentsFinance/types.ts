export interface FinanceOverview {
  grossPayments: number;
  refunds: number;
  netPayments: number;
  invoicedGross: number;
  openDisputesAmount: number;
  paymentCount: number;
}

export interface PaymentIntentRow {
  id: number;
  order_number: string;
  provider_id: number | null;
  method_id: number | null;
  external_id: string | null;
  amount: number;
  currency: string;
  status: string;
  idempotency_key: string | null;
  customer_email: string | null;
  created_at: string;
  updated_at: string;
  provider?: string;
  method_name?: string;
}

export interface FinanceRefund {
  id: number;
  payment_intent_id: number;
  external_id: string | null;
  amount: number;
  currency: string;
  reason: string | null;
  status: string;
  created_at: string;
}

export interface FinanceInvoice {
  id: number;
  order_number: string;
  invoice_number: string;
  customer_email: string | null;
  net_amount: number;
  tax_amount: number;
  gross_amount: number;
  currency: string;
  status: string;
  issued_at: string;
}

export interface FinanceAuditEvent {
  id: number;
  event_type: string;
  reference_id: string | null;
  metadata_json: string | null;
  created_at: string;
}

export interface PaymentsFinanceStatus {
  version: string;
  enabled: boolean;
  providers: number;
  totals: {
    providers: number;
    enabledProviders: number;
    paymentMethods: number;
    paymentIntents: number;
    refunds: number;
    invoices: number;
    payouts: number;
    disputes: number;
    auditEvents: number;
  };
  overview: FinanceOverview;
}
