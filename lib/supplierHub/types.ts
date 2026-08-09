export type SupplierHubSupplier = {
  id: number;
  code: string;
  name: string;
  country: string;
  feed_type: string;
  feed_url: string;
  active: boolean;
  dropship: boolean;
  product_count?: number;
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
