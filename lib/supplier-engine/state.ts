import type { ConnectorHealthStatus } from "./types";
import { computeSupplierReliabilityScore } from "./reliability";
import { getSupplierPersistence } from "./persistence";
import { getSupplierHealth } from "./health";

export type SupplierSyncStatus = "IDLE" | "SYNCING" | "SUCCESS" | "PARTIAL" | "FAILED";

export interface SupplierRuntimeState {
  supplierId: string;
  healthStatus: ConnectorHealthStatus;
  reliabilityScore: number;
  syncStatus: SupplierSyncStatus;
  lastSyncStartedAt?: string;
  lastSyncCompletedAt?: string;
  lastSuccessfulSync?: string;
  lastFailedSync?: string;
  lastSyncError?: string;
  lastErrorCode?: string;
  lastSyncJobId?: string;
  syncLockJobId?: string;
  syncLockAcquiredAt?: string;
  productsProcessed?: number;
  productsAccepted?: number;
  productsRejected?: number;
  offersUpdated?: number;
  stockUpdated?: number;
  priceUpdated?: number;
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

function fromPersisted(row: Record<string, unknown>): SupplierRuntimeState {
  return {
    supplierId: String(row.supplierId),
    healthStatus: (row.healthStatus as ConnectorHealthStatus) || "UNKNOWN",
    reliabilityScore: Number(row.reliabilityScore ?? 0.5),
    syncStatus: (row.syncStatus as SupplierSyncStatus) || "IDLE",
    lastSyncStartedAt: row.lastSyncStartedAt ? String(row.lastSyncStartedAt) : undefined,
    lastSyncCompletedAt: row.lastSyncCompletedAt ? String(row.lastSyncCompletedAt) : undefined,
    lastSuccessfulSync: row.lastSyncSuccessAt ? String(row.lastSyncSuccessAt) : undefined,
    lastFailedSync: row.lastSyncFailureAt ? String(row.lastSyncFailureAt) : undefined,
    lastSyncError: row.lastErrorMessageSafe ? String(row.lastErrorMessageSafe) : undefined,
    lastErrorCode: row.lastErrorCode ? String(row.lastErrorCode) : undefined,
    lastSyncJobId: row.lastSyncJobId ? String(row.lastSyncJobId) : undefined,
    syncLockJobId: row.syncLockJobId ? String(row.syncLockJobId) : undefined,
    syncLockAcquiredAt: row.syncLockAcquiredAt ? String(row.syncLockAcquiredAt) : undefined,
    productsProcessed: Number(row.productsProcessed || 0),
    productsAccepted: Number(row.productsAccepted || 0),
    productsRejected: Number(row.productsRejected || 0),
    offersUpdated: Number(row.offersUpdated || 0),
    stockUpdated: Number(row.stockUpdated || 0),
    priceUpdated: Number(row.priceUpdated || 0),
    updatedAt: String(row.updatedAt || new Date().toISOString()),
  };
}

function toPersisted(state: SupplierRuntimeState): Record<string, unknown> {
  return {
    supplierId: state.supplierId,
    syncStatus: state.syncStatus,
    healthStatus: state.healthStatus,
    lastSyncStartedAt: state.lastSyncStartedAt,
    lastSyncCompletedAt: state.lastSyncCompletedAt,
    lastSyncSuccessAt: state.lastSuccessfulSync,
    lastSyncFailureAt: state.lastFailedSync,
    lastErrorCode: state.lastErrorCode,
    lastErrorMessageSafe: state.lastSyncError,
    lastSyncJobId: state.lastSyncJobId,
    syncLockJobId: state.syncLockJobId,
    syncLockAcquiredAt: state.syncLockAcquiredAt,
    productsProcessed: state.productsProcessed,
    productsAccepted: state.productsAccepted,
    productsRejected: state.productsRejected,
    offersUpdated: state.offersUpdated,
    stockUpdated: state.stockUpdated,
    priceUpdated: state.priceUpdated,
    reliabilityScore: state.reliabilityScore,
  };
}

function persistState(state: SupplierRuntimeState): SupplierRuntimeState {
  stateBySupplier.set(state.supplierId, state);
  getSupplierPersistence()?.saveRuntimeState(toPersisted(state));
  return state;
}

export function hydrateRuntimeStateFromPersistence(): void {
  const persistence = getSupplierPersistence();
  if (!persistence) return;
  const listAll = (persistence as { listAllRuntimeStates?: () => Record<string, unknown>[] }).listAllRuntimeStates;
  const rows = listAll ? listAll.call(persistence) : [];
  for (const runtime of rows) {
    stateBySupplier.set(String(runtime.supplierId), fromPersisted(runtime));
  }
}

export function getSupplierRuntimeState(supplierId: string): SupplierRuntimeState {
  const cached = stateBySupplier.get(supplierId);
  if (cached) return cached;
  const row = getSupplierPersistence()?.getRuntimeState(supplierId);
  if (row) {
    const state = fromPersisted(row);
    stateBySupplier.set(supplierId, state);
    return state;
  }
  const health = getSupplierHealth(supplierId);
  return {
    ...defaultState(supplierId),
    healthStatus: health.healthStatus,
    reliabilityScore: health.reliabilityScore,
  };
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
  return persistState(next);
}

export function markSyncStarted(supplierId: string, jobId: string): SupplierRuntimeState {
  const now = new Date().toISOString();
  return updateSupplierRuntimeState(supplierId, {
    syncStatus: "SYNCING",
    lastSyncJobId: jobId,
    lastSyncStartedAt: now,
    syncLockJobId: jobId,
    syncLockAcquiredAt: now,
  });
}

export function markSyncCompleted(
  supplierId: string,
  outcome: {
    status: "COMPLETED" | "PARTIAL" | "FAILED";
    healthStatus?: ConnectorHealthStatus;
    error?: string;
    errorCode?: string;
    metrics?: Partial<
      Pick<
        SupplierRuntimeState,
        | "productsProcessed"
        | "productsAccepted"
        | "productsRejected"
        | "offersUpdated"
        | "stockUpdated"
        | "priceUpdated"
      >
    >;
  }
): SupplierRuntimeState {
  const now = new Date().toISOString();
  const base = {
    lastSyncCompletedAt: now,
    syncLockJobId: undefined,
    ...outcome.metrics,
  };

  if (outcome.status === "FAILED") {
    return updateSupplierRuntimeState(supplierId, {
      ...base,
      syncStatus: "FAILED",
      healthStatus: outcome.healthStatus ?? "UNHEALTHY",
      lastFailedSync: now,
      lastSyncError: outcome.error,
      lastErrorCode: outcome.errorCode,
    });
  }
  return updateSupplierRuntimeState(supplierId, {
    ...base,
    syncStatus: outcome.status === "PARTIAL" ? "PARTIAL" : "SUCCESS",
    healthStatus: outcome.healthStatus ?? "HEALTHY",
    lastSuccessfulSync: now,
    lastSyncError: outcome.error,
    lastErrorCode: outcome.errorCode,
  });
}

export function tryAcquireSupplierSyncLock(
  supplierId: string,
  jobId: string
): { acquired: boolean; reason?: string } {
  const persistence = getSupplierPersistence();
  if (persistence) {
    const result = persistence.tryAcquireSyncLock(supplierId, jobId);
    if (!result.acquired) {
      return { acquired: false, reason: `SYNC_IN_PROGRESS:${result.ownerJobId}` };
    }
    markSyncStarted(supplierId, jobId);
    return { acquired: true };
  }
  const current = getSupplierRuntimeState(supplierId);
  if (current.syncStatus === "SYNCING" && current.syncLockJobId && current.syncLockJobId !== jobId) {
    return { acquired: false, reason: `SYNC_IN_PROGRESS:${current.syncLockJobId}` };
  }
  markSyncStarted(supplierId, jobId);
  return { acquired: true };
}

export function releaseSupplierSyncLock(supplierId: string, jobId: string): void {
  getSupplierPersistence()?.releaseSyncLock(supplierId, jobId);
  const current = getSupplierRuntimeState(supplierId);
  if (current.syncLockJobId === jobId) {
    updateSupplierRuntimeState(supplierId, { syncLockJobId: undefined, syncLockAcquiredAt: undefined });
  }
}

export function resetSupplierRuntimeState(): void {
  stateBySupplier.clear();
}
