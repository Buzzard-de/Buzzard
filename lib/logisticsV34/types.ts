export interface LogisticsV34Record {
  id: number;
  code: string;
  name: string;
  status: string;
  data_json: string;
  created_at: string;
  updated_at: string;
}

export interface LogisticsV34Job {
  id: number;
  type: string;
  status: string;
  payload_json: string;
  created_at: string;
  completed_at: string | null;
}

export interface LogisticsV34Overview {
  records: number;
  active: number;
  jobs: number;
  queuedJobs: number;
}

export interface LogisticsV34Status {
  version: string;
  module: string;
  enabled: boolean;
  totals: LogisticsV34Overview;
  overview: LogisticsV34Overview;
}
