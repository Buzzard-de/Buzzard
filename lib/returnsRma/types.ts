export interface RmaOverview {
  total: number;
  requested: number;
  inTransit: number;
  inspecting: number;
  refunded: number;
  refundValue: number;
  warranty: number;
}

export interface RmaReturnRow {
  id: number;
  rma_number: string;
  order_number: string;
  customer_id: number | null;
  customer_email: string | null;
  reason: string;
  type: string;
  status: string;
  customer_note: string;
  shipping_label_status: string;
  shipping_tracking: string;
  inspection_status: string;
  inspection_due_at: string | null;
  refund_status: string;
  refund_amount: number;
  exchange_order_number: string;
  warranty_claim: number;
  risk_flag: string;
  created_at: string;
  updated_at: string;
}

export interface ReturnsRmaStatus {
  version: string;
  enabled: boolean;
  totals: {
    returns: number;
    requested: number;
    inTransit: number;
    inspecting: number;
    refunded: number;
    warrantyClaims: number;
    labels: number;
    events: number;
  };
  overview: RmaOverview;
}
