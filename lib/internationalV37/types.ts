export interface InternationalV37Record {
  id: number;
  code: string;
  name: string;
  status: string;
  data_json: string;
  created_at: string;
  updated_at: string;
}

export interface InternationalV37Job {
  id: number;
  type: string;
  status: string;
  payload_json: string;
  created_at: string;
  completed_at: string | null;
}

export interface InternationalV37Overview {
  records: number;
  active: number;
  jobs: number;
  queuedJobs: number;
}

export interface InternationalV37Status {
  version: string;
  module: string;
  enabled: boolean;
  totals: InternationalV37Overview;
  overview: InternationalV37Overview;
}
