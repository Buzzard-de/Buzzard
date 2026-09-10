import { withRetry } from "@/lib/supplier-engine/retry";
import { checkRateLimit } from "@/lib/supplier-engine/rateLimit";
import { getMarketplaceConnector } from "./connector";
import { listListings, saveSyncJob, getSyncJob } from "./registry";
import { updateListing } from "./listing";
import { fetchMarketplaceOrders } from "./order";
import { emitMarketplaceEvent } from "./events";
import type { SyncJob, SyncJobType } from "./types";

function generateJobId(): string {
  return `sync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function runSyncJob(input: {
  marketplaceId: string;
  type: SyncJobType;
}): Promise<{ ok: boolean; job: SyncJob; errorMessage?: string }> {
  const rate = checkRateLimit(`sync:${input.marketplaceId}`, { requestsPerMinute: 30 });
  if (!rate.allowed) {
    const job: SyncJob = {
      jobId: generateJobId(),
      marketplaceId: input.marketplaceId,
      type: input.type,
      status: "FAILED",
      error: "RATE_LIMITED",
      itemsProcessed: 0,
      createdAt: new Date().toISOString(),
    };
    saveSyncJob(job);
    return { ok: false, job, errorMessage: "RATE_LIMITED" };
  }

  const job: SyncJob = {
    jobId: generateJobId(),
    marketplaceId: input.marketplaceId,
    type: input.type,
    status: "RUNNING",
    startedAt: new Date().toISOString(),
    itemsProcessed: 0,
    createdAt: new Date().toISOString(),
  };
  saveSyncJob(job);

  emitMarketplaceEvent({
    marketplaceId: input.marketplaceId,
    type: "SYNC_STARTED",
    source: "marketplace-engine",
    metadata: { jobId: job.jobId, syncType: input.type },
  });

  try {
    let processed = 0;

    await withRetry(async () => {
      switch (input.type) {
        case "FULL_PRODUCT_SYNC":
        case "INCREMENTAL_PRODUCT_SYNC": {
          const listings = listListings(input.marketplaceId);
          for (const listing of listings) {
            await updateListing(listing.listingId);
            processed += 1;
          }
          break;
        }
        case "PRICE_SYNC":
        case "STOCK_SYNC": {
          const listings = listListings(input.marketplaceId);
          for (const listing of listings) {
            await updateListing(listing.listingId);
            processed += 1;
          }
          break;
        }
        case "ORDER_SYNC": {
          await fetchMarketplaceOrders(input.marketplaceId);
          processed += 1;
          break;
        }
        case "SHIPMENT_SYNC":
        case "RETURN_SYNC": {
          const connector = getMarketplaceConnector(input.marketplaceId);
          await connector.fetchReturns();
          processed += 1;
          break;
        }
      }
    }, { maxAttempts: 2 });

    const completed: SyncJob = {
      ...job,
      status: "COMPLETED",
      completedAt: new Date().toISOString(),
      itemsProcessed: processed,
    };
    saveSyncJob(completed);

    emitMarketplaceEvent({
      marketplaceId: input.marketplaceId,
      type: "SYNC_COMPLETED",
      source: "marketplace-engine",
      metadata: { jobId: job.jobId, itemsProcessed: processed },
    });

    return { ok: true, job: completed };
  } catch (err) {
    const failed: SyncJob = {
      ...job,
      status: "FAILED",
      completedAt: new Date().toISOString(),
      error: err instanceof Error ? err.message : "SYNC_FAILED",
    };
    saveSyncJob(failed);

    emitMarketplaceEvent({
      marketplaceId: input.marketplaceId,
      type: "SYNC_FAILED",
      source: "marketplace-engine",
      metadata: { jobId: job.jobId, error: failed.error },
    });

    return { ok: false, job: failed, errorMessage: failed.error };
  }
}

export { getSyncJob };
