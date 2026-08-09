export interface FulfillmentV33Record {
  id: number;
  code: string;
  name: string;
  status: string;
  data_json: string;
  created_at: string;
  updated_at: string;
}

export interface FulfillmentV33Job {
  id: number;
  type: string;
  status: string;
  payload_json: string;
  created_at: string;
  completed_at: string | null;
}

export interface FulfillmentV33Overview {
  records: number;
  active: number;
  jobs: number;
  queuedJobs: number;
}

export interface FulfillmentV33Status {
  version: string;
  module: string;
  enabled: boolean;
  totals: FulfillmentV33Overview;
  overview: FulfillmentV33Overview;
}
