export interface PaymentsV36Record {
  id: number;
  code: string;
  name: string;
  status: string;
  data_json: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentsV36Job {
  id: number;
  type: string;
  status: string;
  payload_json: string;
  created_at: string;
  completed_at: string | null;
}

export interface PaymentsV36Overview {
  records: number;
  active: number;
  jobs: number;
  queuedJobs: number;
}

export interface PaymentsV36Status {
  version: string;
  module: string;
  enabled: boolean;
  totals: PaymentsV36Overview;
  overview: PaymentsV36Overview;
}
