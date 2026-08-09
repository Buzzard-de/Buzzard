export interface AnalyticsV39Record {
  id: number;
  code: string;
  name: string;
  status: string;
  data_json: string;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsV39Job {
  id: number;
  type: string;
  status: string;
  payload_json: string;
  created_at: string;
  completed_at: string | null;
}

export interface AnalyticsV39Overview {
  records: number;
  active: number;
  jobs: number;
  queuedJobs: number;
}

export interface AnalyticsV39Status {
  version: string;
  module: string;
  enabled: boolean;
  totals: AnalyticsV39Overview;
  overview: AnalyticsV39Overview;
}
