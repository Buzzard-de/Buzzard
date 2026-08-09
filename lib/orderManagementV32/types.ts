export interface OrderManagementV32Record {
  id: number;
  code: string;
  name: string;
  status: string;
  data_json: string;
  created_at: string;
  updated_at: string;
}

export interface OrderManagementV32Job {
  id: number;
  type: string;
  status: string;
  payload_json: string;
  created_at: string;
  completed_at: string | null;
}

export interface OrderManagementV32Overview {
  records: number;
  active: number;
  jobs: number;
  queuedJobs: number;
}

export interface OrderManagementV32Status {
  version: string;
  module: string;
  enabled: boolean;
  totals: OrderManagementV32Overview;
  overview: OrderManagementV32Overview;
}
