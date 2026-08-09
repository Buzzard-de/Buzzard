export type SupplierHubSupplier = {
  id: number;
  code: string;
  name: string;
  country: string;
  feed_type: string;
  feed_url: string;
  active: boolean;
  dropship: boolean;
  api_enabled?: boolean;
  xml_enabled?: boolean;
  tecdoc_enabled?: boolean;
  white_label_enabled?: boolean;
  blind_shipping?: boolean;
  currency?: string;
  rating?: number;
  lead_time_days?: number;
  status?: string;
  product_count?: number;
  products?: number;
  queuedJobs?: number;
};

export type SupplierHubSyncJob = {
  id: number;
  supplier_id: number;
  job_type: string;
  entity_key: string;
  status: string;
  attempts: number;
  error_message: string | null;
  created_at: string;
  finished_at: string | null;
  supplier: string;
  supplier_name: string;
};

export type SupplierHubOrder = {
  id: number;
  supplier_id: number;
  order_number: string;
  supplier_order_number: string | null;
  status: string;
  shipping_method: string;
  white_label: number;
  blind_shipping: number;
  payload_json: string;
  created_at: string;
  supplier: string;
  supplier_name: string;
};

export type SupplierHubSourcingRow = {
  id: number;
  supplier_sku: string;
  product_sku: string;
  name: string;
  cost: number;
  stock: number;
  brand: string;
  category: string;
  supplier: string;
  supplier_name: string;
  rating: number;
  lead_time_days: number;
  dropship_enabled: number;
  white_label_enabled: number;
  blind_shipping: number;
  tecdoc_enabled: number;
};

export type SupplierHubSyncRun = {
  id: number;
  supplier_id: number;
  supplier_name: string;
  status: string;
  imported: number;
  updated: number;
  errors: number;
  message: string;
  started_at: string;
};

export type SupplierHubMargin = {
  supplier_sku: string;
  name: string;
  cost_eur: number;
  price_eur: number | null;
  margin_percent: number | null;
};

export type SupplierHubVehicle = {
  id: number;
  make: string;
  model: string;
  year_from: number;
  year_to: number;
  engine: string;
};

export type SupplierHubStatus = {
  version: string;
  enabled: boolean;
  tecdocConfigured: boolean;
  totals: {
    suppliers: number;
    supplierProducts: number;
    vehicles: number;
    syncRuns: number;
    syncJobs?: number;
    supplierOrders?: number;
    queuedJobs?: number;
    compatibility: number;
  };
};

export type SupplierHubSyncResult = {
  runId: number;
  imported: number;
  updated: number;
  errors: number;
};

export type SupplierHubCompatibility = {
  product_sku: string;
  vehicle_id: number;
  status: string;
  source: string;
  make: string;
  model: string;
  year_from: number;
  year_to: number;
  engine: string;
};
