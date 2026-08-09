export interface SecurityV38Record {
  id: number;
  code: string;
  name: string;
  status: string;
  data_json: string;
  created_at: string;
  updated_at: string;
}

export interface SecurityV38Job {
  id: number;
  type: string;
  status: string;
  payload_json: string;
  created_at: string;
  completed_at: string | null;
}

export interface SecurityV38Overview {
  records: number;
  active: number;
  jobs: number;
  queuedJobs: number;
}

export interface SecurityV38Status {
  version: string;
  module: string;
  enabled: boolean;
  totals: SecurityV38Overview;
  overview: SecurityV38Overview;
}
