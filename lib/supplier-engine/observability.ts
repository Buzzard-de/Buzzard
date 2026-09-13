import type { SyncMetrics } from "./types";
import { redactSecrets } from "./security";

export interface SupplierLogEntry {
  supplierId: string;
  connector: string;
  operation: string;
  durationMs: number;
  status: "SUCCESS" | "FAILURE" | "PARTIAL";
  records: number;
  timestamp: string;
  correlationId?: string;
  errorCode?: string;
  result?: string;
  error?: string;
}

const logBuffer: SupplierLogEntry[] = [];
const metricsBuffer: SyncMetrics[] = [];
const MAX_LOG = 2000;

export function logSupplierOperation(entry: Omit<SupplierLogEntry, "timestamp">): SupplierLogEntry {
  const record: SupplierLogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
    error: entry.error ? String(redactSecrets({ msg: entry.error })) : undefined,
  };
  logBuffer.push(record);
  if (logBuffer.length > MAX_LOG) logBuffer.shift();
  return record;
}

export function recordSyncMetrics(metrics: SyncMetrics): void {
  metricsBuffer.push(metrics);
  if (metricsBuffer.length > 500) metricsBuffer.shift();
}

export function getSupplierLogs(supplierId?: string): SupplierLogEntry[] {
  if (!supplierId) return [...logBuffer];
  return logBuffer.filter((l) => l.supplierId === supplierId);
}

export function getSyncMetrics(supplierId?: string): SyncMetrics[] {
  if (!supplierId) return [...metricsBuffer];
  return metricsBuffer.filter((_, i) => {
    const log = logBuffer[i];
    return log?.supplierId === supplierId;
  });
}

export function clearObservability(): void {
  logBuffer.length = 0;
  metricsBuffer.length = 0;
}
