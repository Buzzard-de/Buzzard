import type { WorkerExecutionRecord } from "./types";
import { DEFAULT_EXECUTION_TIMEOUT_MS } from "./constants";

export function computeDeadline(startedAt: string, timeoutMs: number = DEFAULT_EXECUTION_TIMEOUT_MS): string {
  return new Date(new Date(startedAt).getTime() + timeoutMs).toISOString();
}

export function isTimedOut(record: WorkerExecutionRecord, now: number = Date.now()): boolean {
  if (!record.deadlineAt) return false;
  return now > new Date(record.deadlineAt).getTime();
}

export function applyTimeout(record: WorkerExecutionRecord): WorkerExecutionRecord {
  return {
    ...record,
    status: "TIMED_OUT",
    completedAt: new Date().toISOString(),
    durationMs: record.startedAt
      ? Date.now() - new Date(record.startedAt).getTime()
      : undefined,
    error: "EXECUTION_TIMED_OUT",
  };
}
