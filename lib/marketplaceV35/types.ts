export interface MarketplaceV35Record {
  id: number;
  code: string;
  name: string;
  status: string;
  data_json: string;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceV35Job {
  id: number;
  type: string;
  status: string;
  payload_json: string;
  created_at: string;
  completed_at: string | null;
}

export interface MarketplaceV35Overview {
  records: number;
  active: number;
  jobs: number;
  queuedJobs: number;
}

export interface MarketplaceV35Status {
  version: string;
  module: string;
  enabled: boolean;
  totals: MarketplaceV35Overview;
  overview: MarketplaceV35Overview;
}
