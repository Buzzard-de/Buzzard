export interface MasterAdminV40Record {
  id: number;
  code: string;
  name: string;
  status: string;
  data_json: string;
  created_at: string;
  updated_at: string;
}

export interface MasterAdminV40Job {
  id: number;
  type: string;
  status: string;
  payload_json: string;
  created_at: string;
  completed_at: string | null;
}

export interface MasterAdminV40Overview {
  records: number;
  active: number;
  jobs: number;
  queuedJobs: number;
}

export interface MasterAdminV40Status {
  version: string;
  module: string;
  enabled: boolean;
  totals: MasterAdminV40Overview;
  overview: MasterAdminV40Overview;
}
