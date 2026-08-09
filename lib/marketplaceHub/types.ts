export interface MarketplaceChannel {
  id: number;
  code: string;
  name: string;
  enabled: number;
  account_label: string;
  status: string;
  last_sync: string | null;
  created_at: string;
  listings: number;
  queuedJobs: number;
}

export interface MarketplaceSyncJob {
  id: number;
  marketplace_id: number;
  job_type: string;
  entity_key: string;
  payload_json: string;
  status: string;
  attempts: number;
  error_message: string | null;
  created_at: string;
  finished_at: string | null;
  marketplace: string;
  marketplace_name: string;
}

export interface MarketplaceChannelOrder {
  id: number;
  marketplace_id: number;
  external_order_id: string;
  internal_order_number: string | null;
  status: string;
  total: number;
  currency: string;
  customer_country: string;
  imported_at: string;
  marketplace: string;
}

export interface MarketplaceHubStatus {
  version: string;
  enabled: boolean;
  channels: number;
  totals: {
    marketplaces: number;
    listings: number;
    syncJobs: number;
    channelOrders: number;
    queuedJobs: number;
  };
}

export interface UpsertListingInput {
  marketplace: string;
  productSku: string;
  channelSku?: string;
  title?: string;
  price?: number;
  currency?: string;
  stock?: number;
  status?: string;
}

export interface UpsertSkuMapInput {
  marketplace: string;
  productSku: string;
  channelSku: string;
}
