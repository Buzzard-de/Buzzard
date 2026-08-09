export interface SupplierIntegrationHubOverview {
  suppliers: number;
  active: number;
  dropship: number;
  blindShipping: number;
  whiteLabel: number;
  mappings: number;
  syncJobs: number;
  supplierOrders: number;
}

export interface SupplierIntegrationHubRow {
  id: number;
  code: string;
  name: string;
  country: string;
  status: string;
  feed_type: string;
  base_url: string;
  feed_url: string;
  auth_type: string;
  credentials_ref: string;
  api_version: string;
  supports_dropshipping: number;
  supports_blind_shipping: number;
  supports_white_label: number;
  supports_api: number;
  supports_xml: number;
  supports_csv: number;
  supports_ftp: number;
  default_currency: string;
  lead_time_days: number;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierIntegrationHubStatus {
  version: string;
  enabled: boolean;
  totals: {
    suppliers: number;
    active: number;
    dropship: number;
    blindShipping: number;
    whiteLabel: number;
    mappings: number;
    syncJobs: number;
    supplierOrders: number;
    snapshots: number;
  };
  overview: SupplierIntegrationHubOverview;
}
