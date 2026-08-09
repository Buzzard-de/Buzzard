export interface LogisticsCarrier {
  id: number;
  code: string;
  name: string;
  country_scope: string;
  enabled: boolean;
  api_connected: boolean;
  service_count: number;
  created_at: string;
}

export interface ShippingOption {
  id: number;
  carrier_id: number;
  code: string;
  name: string;
  max_weight_kg: number;
  base_price: number;
  delivery_days_min: number;
  delivery_days_max: number;
  countries: string;
  active: number;
  carrier: string;
  carrier_name: string;
  estimatedCost?: number;
}

export interface LogisticsShipment {
  id: number;
  order_number: string;
  carrier_id: number | null;
  service_id: number | null;
  tracking_number: string | null;
  label_url: string | null;
  status: string;
  shipping_cost: number;
  destination_country: string | null;
  created_at: string;
  shipped_at: string | null;
  carrier?: string;
  service_name?: string;
}

export interface LogisticsReturn {
  id: number;
  rma_number: string;
  order_number: string;
  customer_id: number | null;
  reason: string;
  status: string;
  carrier_code: string | null;
  return_tracking: string | null;
  refund_status: string;
  created_at: string;
}

export interface FulfillmentJob {
  id: number;
  order_number: string;
  job_type: string;
  status: string;
  attempts: number;
  error_message: string | null;
  created_at: string;
  finished_at: string | null;
}

export interface LogisticsFulfillmentStatus {
  version: string;
  enabled: boolean;
  carriers: number;
  totals: {
    carriers: number;
    shippingServices: number;
    shipments: number;
    trackingEvents: number;
    fulfillmentJobs: number;
    queuedJobs: number;
    returns: number;
  };
}
