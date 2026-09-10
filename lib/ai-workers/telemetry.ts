import type { TelemetryMetrics, WorkerId } from "./types";

let executionCount = 0;
let successCount = 0;
let failureCount = 0;
let timeoutCount = 0;
let validationRejectionCount = 0;
let approvalWaitCount = 0;
const durations: number[] = [];
const providerUsage: Record<string, number> = {};
const workerUsage: Partial<Record<WorkerId, number>> = {};

export function recordExecutionStart(workerId: WorkerId, providerId: string): void {
  executionCount += 1;
  workerUsage[workerId] = (workerUsage[workerId] ?? 0) + 1;
  providerUsage[providerId] = (providerUsage[providerId] ?? 0) + 1;
}

export function recordExecutionSuccess(durationMs: number): void {
  successCount += 1;
  durations.push(durationMs);
}

export function recordExecutionFailure(): void {
  failureCount += 1;
}

export function recordExecutionTimeout(): void {
  timeoutCount += 1;
  failureCount += 1;
}

export function recordValidationRejection(): void {
  validationRejectionCount += 1;
}

export function recordApprovalWait(): void {
  approvalWaitCount += 1;
}

export function getTelemetryMetrics(): TelemetryMetrics {
  const averageDurationMs =
    durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  return {
    executionCount,
    successCount,
    failureCount,
    timeoutCount,
    validationRejectionCount,
    approvalWaitCount,
    averageDurationMs,
    providerUsage: { ...providerUsage },
    workerUsage: workerUsage as Record<WorkerId, number>,
  };
}

export function resetTelemetry(): void {
  executionCount = 0;
  successCount = 0;
  failureCount = 0;
  timeoutCount = 0;
  validationRejectionCount = 0;
  approvalWaitCount = 0;
  durations.length = 0;
  for (const key of Object.keys(providerUsage)) delete providerUsage[key];
  for (const key of Object.keys(workerUsage)) delete workerUsage[key as WorkerId];
}
