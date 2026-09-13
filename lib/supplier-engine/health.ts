import type { ConnectorHealthStatus } from "./types";
import { getSupplierPersistence } from "./persistence";

export interface SupplierHealthRecord {
  supplierId: string;
  healthStatus: ConnectorHealthStatus;
  responseTimeMs: number;
  errorCount: number;
  successCount: number;
  rateLimitCount: number;
  consecutiveFailures: number;
  lastSuccessfulOperation?: string;
  lastFailedOperation?: string;
  reliabilityScore: number;
  updatedAt: string;
}

const healthCache = new Map<string, SupplierHealthRecord>();

function defaultHealth(supplierId: string): SupplierHealthRecord {
  return {
    supplierId,
    healthStatus: "UNKNOWN",
    responseTimeMs: 0,
    errorCount: 0,
    successCount: 0,
    rateLimitCount: 0,
    consecutiveFailures: 0,
    reliabilityScore: 0.5,
    updatedAt: new Date().toISOString(),
  };
}

function fromPersisted(row: Record<string, unknown>): SupplierHealthRecord {
  return {
    supplierId: String(row.supplierId),
    healthStatus: (row.healthStatus as ConnectorHealthStatus) || "UNKNOWN",
    responseTimeMs: Number(row.responseTimeMs || 0),
    errorCount: Number(row.errorCount || 0),
    successCount: Number(row.successCount || 0),
    rateLimitCount: Number(row.rateLimitCount || 0),
    consecutiveFailures: Number(row.consecutiveFailures || 0),
    lastSuccessfulOperation: row.lastSuccessfulOperation ? String(row.lastSuccessfulOperation) : undefined,
    lastFailedOperation: row.lastFailedOperation ? String(row.lastFailedOperation) : undefined,
    reliabilityScore: Number(row.reliabilityScore ?? 0.5),
    updatedAt: String(row.updatedAt || new Date().toISOString()),
  };
}

export function hydrateHealthFromPersistence(): void {
  const persistence = getSupplierPersistence();
  if (!persistence) return;
  const listAll = (persistence as { listAllHealthRecords?: () => Record<string, unknown>[] }).listAllHealthRecords;
  const rows = listAll ? listAll.call(persistence) : [];
  for (const health of rows) {
    healthCache.set(String(health.supplierId), fromPersisted(health));
  }
}

export function getSupplierHealth(supplierId: string): SupplierHealthRecord {
  const cached = healthCache.get(supplierId);
  if (cached) return cached;
  const persistence = getSupplierPersistence();
  const row = persistence?.getHealth(supplierId);
  if (row) {
    const record = fromPersisted(row);
    healthCache.set(supplierId, record);
    return record;
  }
  return defaultHealth(supplierId);
}

function persistHealth(record: SupplierHealthRecord): SupplierHealthRecord {
  healthCache.set(record.supplierId, record);
  getSupplierPersistence()?.saveHealth(record as unknown as Record<string, unknown>);
  return record;
}

export function recordSupplierHealthSuccess(
  supplierId: string,
  options: { responseTimeMs?: number; operation?: string } = {}
): SupplierHealthRecord {
  const current = getSupplierHealth(supplierId);
  const successCount = current.successCount + 1;
  const reliabilityScore = successCount / Math.max(successCount + current.errorCount, 1);
  let healthStatus: ConnectorHealthStatus = "HEALTHY";
  if (current.consecutiveFailures > 0) healthStatus = "DEGRADED";

  return persistHealth({
    ...current,
    healthStatus,
    responseTimeMs: options.responseTimeMs ?? current.responseTimeMs,
    successCount,
    consecutiveFailures: 0,
    lastSuccessfulOperation: options.operation || new Date().toISOString(),
    reliabilityScore: Math.round(reliabilityScore * 100) / 100,
    updatedAt: new Date().toISOString(),
  });
}

export function recordSupplierHealthFailure(
  supplierId: string,
  options: { errorCode?: string; responseTimeMs?: number; rateLimited?: boolean } = {}
): SupplierHealthRecord {
  const current = getSupplierHealth(supplierId);
  const errorCount = current.errorCount + 1;
  const consecutiveFailures = current.consecutiveFailures + 1;
  const rateLimitCount = current.rateLimitCount + (options.rateLimited ? 1 : 0);
  const reliabilityScore = current.successCount / Math.max(current.successCount + errorCount, 1);

  let healthStatus: ConnectorHealthStatus = "DEGRADED";
  if (options.errorCode === "AUTH_FAILED" || options.errorCode === "FORBIDDEN") {
    healthStatus = "UNHEALTHY";
  } else if (consecutiveFailures >= 5) {
    healthStatus = "UNHEALTHY";
  }

  return persistHealth({
    ...current,
    healthStatus,
    responseTimeMs: options.responseTimeMs ?? current.responseTimeMs,
    errorCount,
    rateLimitCount,
    consecutiveFailures,
    lastFailedOperation: new Date().toISOString(),
    reliabilityScore: Math.round(reliabilityScore * 100) / 100,
    updatedAt: new Date().toISOString(),
  });
}

export function setSupplierHealthDisabled(supplierId: string): SupplierHealthRecord {
  return persistHealth({
    ...getSupplierHealth(supplierId),
    healthStatus: "UNHEALTHY",
    updatedAt: new Date().toISOString(),
  });
}

export function resetSupplierHealthCache(): void {
  healthCache.clear();
}
