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

export interface SupplierRequestMetric {
  supplierId: string;
  operation: string;
  success: boolean;
  latencyMs: number;
  statusCode?: number;
  rateLimited?: boolean;
  authFailure?: boolean;
}

const requestMetrics = {
  supplier_requests_total: 0,
  supplier_request_failures: 0,
  supplier_request_latency_ms: 0,
  supplier_rate_limits: 0,
  supplier_auth_failures: 0,
  supplier_sync_success: 0,
  supplier_sync_failure: 0,
};

export function recordSupplierRequestMetric(metric: SupplierRequestMetric): void {
  requestMetrics.supplier_requests_total++;
  requestMetrics.supplier_request_latency_ms += metric.latencyMs;
  if (!metric.success) requestMetrics.supplier_request_failures++;
  if (metric.rateLimited) requestMetrics.supplier_rate_limits++;
  if (metric.authFailure) requestMetrics.supplier_auth_failures++;
}

export function recordSupplierSyncOutcomeMetric(success: boolean): void {
  if (success) requestMetrics.supplier_sync_success++;
  else requestMetrics.supplier_sync_failure++;
}

export function getSupplierConnectorMetrics(): typeof requestMetrics {
  return { ...requestMetrics };
}

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
  requestMetrics.supplier_requests_total = 0;
  requestMetrics.supplier_request_failures = 0;
  requestMetrics.supplier_request_latency_ms = 0;
  requestMetrics.supplier_rate_limits = 0;
  requestMetrics.supplier_auth_failures = 0;
  requestMetrics.supplier_sync_success = 0;
  requestMetrics.supplier_sync_failure = 0;
}
