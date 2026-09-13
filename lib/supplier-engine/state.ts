import type { ConnectorHealthStatus } from "./types";
import { computeSupplierReliabilityScore } from "./reliability";

export type SupplierSyncStatus = "IDLE" | "SYNCING" | "SUCCESS" | "PARTIAL" | "FAILED";

export interface SupplierRuntimeState {
  supplierId: string;
  healthStatus: ConnectorHealthStatus;
  reliabilityScore: number;
  syncStatus: SupplierSyncStatus;
  lastSuccessfulSync?: string;
  lastFailedSync?: string;
  lastSyncError?: string;
  lastSyncJobId?: string;
  updatedAt: string;
}

const stateBySupplier = new Map<string, SupplierRuntimeState>();

function defaultState(supplierId: string): SupplierRuntimeState {
  return {
    supplierId,
    healthStatus: "UNKNOWN",
    reliabilityScore: 0.5,
    syncStatus: "IDLE",
    updatedAt: new Date().toISOString(),
  };
}

export function getSupplierRuntimeState(supplierId: string): SupplierRuntimeState {
  return stateBySupplier.get(supplierId) ?? defaultState(supplierId);
}

export function updateSupplierRuntimeState(
  supplierId: string,
  patch: Partial<Omit<SupplierRuntimeState, "supplierId">>
): SupplierRuntimeState {
  const current = getSupplierRuntimeState(supplierId);
  const reliability = computeSupplierReliabilityScore(supplierId);
  const next: SupplierRuntimeState = {
    ...current,
    ...patch,
    supplierId,
    reliabilityScore: patch.reliabilityScore ?? reliability.score,
    updatedAt: new Date().toISOString(),
  };
  stateBySupplier.set(supplierId, next);
  return next;
}

export function markSyncStarted(supplierId: string, jobId: string): SupplierRuntimeState {
  return updateSupplierRuntimeState(supplierId, {
    syncStatus: "SYNCING",
    lastSyncJobId: jobId,
  });
}

export function markSyncCompleted(
  supplierId: string,
  outcome: { status: "COMPLETED" | "PARTIAL" | "FAILED"; healthStatus?: ConnectorHealthStatus; error?: string }
): SupplierRuntimeState {
  const now = new Date().toISOString();
  if (outcome.status === "FAILED") {
    return updateSupplierRuntimeState(supplierId, {
      syncStatus: "FAILED",
      healthStatus: outcome.healthStatus ?? "UNHEALTHY",
      lastFailedSync: now,
      lastSyncError: outcome.error,
    });
  }
  return updateSupplierRuntimeState(supplierId, {
    syncStatus: outcome.status === "PARTIAL" ? "PARTIAL" : "SUCCESS",
    healthStatus: outcome.healthStatus ?? "HEALTHY",
    lastSuccessfulSync: now,
    lastSyncError: outcome.error,
  });
}

export function resetSupplierRuntimeState(): void {
  stateBySupplier.clear();
}
