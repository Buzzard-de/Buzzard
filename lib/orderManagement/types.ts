export interface OmsOverview {
  totalOrders: number;
  pending: number;
  processing: number;
  fulfilled: number;
  cancelled: number;
  grossValue: number;
}

export interface OmsOrderRow {
  id: number;
  order_number: string;
  customer_id: number | null;
  customer_email: string | null;
  channel: string;
  currency: string;
  subtotal: number;
  shipping_total: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  payment_status: string;
  fulfillment_status: string;
  order_status: string;
  parent_order_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface OmsOrderEvent {
  id: number;
  order_id: number;
  event_type: string;
  old_status: string | null;
  new_status: string | null;
  message: string | null;
  metadata_json: string | null;
  created_at: string;
}

export interface OrderManagementStatus {
  version: string;
  enabled: boolean;
  totals: {
    orders: number;
    pending: number;
    processing: number;
    fulfilled: number;
    cancelled: number;
    events: number;
    fulfillmentLinks: number;
    splits: number;
  };
  overview: OmsOverview;
}
