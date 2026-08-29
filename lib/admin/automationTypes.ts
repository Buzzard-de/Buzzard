export interface WorkerState {
  status: string;
  workerId: string | null;
  jobsProcessed: number;
  lastTickAt?: string | null;
  startedAt?: string | null;
  pausedAt?: string | null;
}

export interface BackgroundJob {
  id: string;
  jobType: string;
  status: string;
  priority: string;
  retryCount: number;
  error?: string | null;
  executionMs?: number | null;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface Schedule {
  id: string;
  name: string;
  jobType: string;
  scheduleType: string;
  enabled: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  runCount: number;
}

export interface IntegrationHealthRow {
  integrationCode: string;
  status: string;
  responseTimeMs: number | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  errorCount: number;
  lastError: string | null;
}
