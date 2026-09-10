import type { WorkerExecutionRecord } from "./types";

const executions = new Map<string, WorkerExecutionRecord>();
const idempotencyIndex = new Map<string, string>();
const responseHashIndex = new Map<string, string>();

let executionCounter = 0;

export function generateExecutionId(): string {
  executionCounter += 1;
  const year = new Date().getFullYear();
  return `BZ-AI-EXEC-${year}-${String(executionCounter).padStart(6, "0")}`;
}

export function saveExecution(record: WorkerExecutionRecord): void {
  executions.set(record.executionId, record);
  if (record.idempotencyKey) {
    idempotencyIndex.set(`${record.taskId}:${record.idempotencyKey}`, record.executionId);
  }
}

export function getExecution(executionId: string): WorkerExecutionRecord | undefined {
  return executions.get(executionId);
}

export function getExecutionByIdempotency(taskId: string, idempotencyKey: string): WorkerExecutionRecord | undefined {
  const id = idempotencyIndex.get(`${taskId}:${idempotencyKey}`);
  return id ? executions.get(id) : undefined;
}

export function markResponseHashProcessed(hash: string, executionId: string): void {
  responseHashIndex.set(hash, executionId);
}

export function isResponseHashProcessed(hash: string): boolean {
  return responseHashIndex.has(hash);
}

export function listExecutions(): WorkerExecutionRecord[] {
  return [...executions.values()];
}

export function clearExecutionRegistry(): void {
  executions.clear();
  idempotencyIndex.clear();
  responseHashIndex.clear();
  executionCounter = 0;
}
