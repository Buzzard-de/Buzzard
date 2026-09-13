import { runSupplierSyncJob } from "./sync";
import { evaluateLiveReadSyncGuard } from "./liveReadGuard";
import { recordSupplierEngineAudit } from "./audit";
import type { SyncJobResult, SyncJobType } from "./types";

export interface LiveReadSyncResult extends SyncJobResult {
  liveRead: true;
  guardReasons?: string[];
}

export async function runSupplierLiveReadSync(
  supplierId: string,
  options: { jobType?: SyncJobType } = {}
): Promise<LiveReadSyncResult> {
  const jobType = options.jobType ?? "FULL";
  const guard = evaluateLiveReadSyncGuard(supplierId, jobType);

  if (!guard.allowed) {
    const now = new Date().toISOString();
    recordSupplierEngineAudit({
      supplierId,
      action: "supplier.live_read.blocked",
      metadata: { reasons: guard.reasons, jobType },
    });
    return {
      liveRead: true,
      guardReasons: guard.reasons,
      jobId: `live_read_${supplierId}_${Date.now()}`,
      supplierId,
      jobType,
      status: "FAILED",
      productsFetched: 0,
      productsCreated: 0,
      productsUpdated: 0,
      productsFailed: 0,
      stockUpdates: 0,
      priceUpdates: 0,
      errors: guard.reasons.map((code) => ({ code, message: code })),
      startedAt: now,
      completedAt: now,
    };
  }

  recordSupplierEngineAudit({
    supplierId,
    action: "supplier.live_read.started",
    metadata: { jobType },
  });

  const result = await runSupplierSyncJob(supplierId, {
    jobType,
    integrationType: "b2b-sandbox",
  });

  recordSupplierEngineAudit({
    supplierId,
    action: result.status === "FAILED" ? "supplier.live_read.failed" : "supplier.live_read.completed",
    metadata: {
      jobType,
      status: result.status,
      productsFetched: result.productsFetched,
    },
  });

  return { ...result, liveRead: true };
}
