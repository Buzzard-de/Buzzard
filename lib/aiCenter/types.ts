export interface AiCenterOverview {
  sessions: number;
  messages: number;
  jobs: number;
  completedJobs: number;
  handoffs: number;
  prompts: number;
}

export interface AiJobRow {
  id: number;
  job_type: string;
  entity_type: string;
  entity_id: string;
  input_json: string | null;
  output_json: string | null;
  status: string;
  model: string;
  created_at: string;
  completed_at: string | null;
}

export interface AiCenterStatus {
  version: string;
  enabled: boolean;
  provider: string;
  totals: {
    sessions: number;
    messages: number;
    jobs: number;
    completedJobs: number;
    handoffs: number;
    prompts: number;
    auditEvents: number;
  };
  overview: AiCenterOverview;
}

export interface AiChatResponse {
  sessionToken: string;
  intent: string;
  answer: string;
  humanHandoff: boolean;
  provider: string;
}
