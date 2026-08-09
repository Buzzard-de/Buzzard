export interface AutomationJob {
  id: number;
  job_key: string;
  type: string;
  order_number: string;
  status: string;
  attempts: number;
  next_run_at: string | null;
  last_error: string | null;
  payload: string | null;
  created_at: string;
}

export interface IntegrationEventRow {
  id: number;
  event_key: string;
  type: string;
  order_number: string | null;
  provider: string | null;
  status: string;
  payload: string | null;
  created_at: string;
}

export interface OrderFlowRow {
  order_number: string;
  payment_status: string;
  fulfillment_status: string;
  shipping_status: string;
  supplier_status: string;
  tracking_number: string | null;
  last_error: string | null;
  updated_at: string;
}

export interface OrderAutomationStatus {
  version: string;
  enabled: boolean;
  jobs: Array<{ status: string; count: number }>;
  events: Array<{ type: string; status: string; count: number }>;
  flows: Array<{
    payment_status: string;
    fulfillment_status: string;
    shipping_status: string;
    supplier_status: string;
    count: number;
  }>;
  providers: {
    payment: string;
    carrier: string;
    supplierMode: string;
  };
  totals: {
    jobs: number;
    events: number;
    flows: number;
  };
}

export interface OrderFlowDetail {
  flow: OrderFlowRow | null;
  events: IntegrationEventRow[];
  jobs: AutomationJob[];
}
