import { healthCheckMarketplace } from "./connector";
import {
  getMarketplace,
  listListings,
  listOrderMappings,
  listSyncJobs,
} from "./registry";
import { getMarketplaceEvents as getEvents } from "./events";
import type { MarketplaceHealth } from "./types";

export async function checkMarketplaceHealth(marketplaceId: string): Promise<MarketplaceHealth> {
  const mp = getMarketplace(marketplaceId);
  if (!mp) {
    return {
      marketplaceId,
      connector: "dry-run",
      status: "DISABLED",
      latencyMs: 0,
      productsSynced: 0,
      pricesSynced: 0,
      stockSynced: 0,
      ordersSynced: 0,
      webhooksProcessed: 0,
      lastError: "MARKETPLACE_NOT_FOUND",
      checkedAt: new Date().toISOString(),
    };
  }

  const healthResult = await healthCheckMarketplace({ marketplaceId, marketId: mp.supportedMarkets[0] });
  const listings = listListings(marketplaceId);
  const orders = listOrderMappings(marketplaceId);
  const syncJobs = listSyncJobs(marketplaceId);
  const lastCompleted = syncJobs
    .filter((j) => j.status === "COMPLETED")
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))[0];
  const lastFailed = syncJobs.find((j) => j.status === "FAILED");
  const webhookEvents = getEvents(marketplaceId).filter((e) => e.type === "WEBHOOK_RECEIVED");

  return {
    marketplaceId,
    connector: mp.connectorType,
    status: mp.status,
    latencyMs: healthResult.data?.latencyMs ?? 0,
    lastSuccessfulSync: lastCompleted?.completedAt,
    lastError: lastFailed?.error,
    productsSynced: listings.length,
    pricesSynced: listings.filter((l) => l.lastSyncedAt).length,
    stockSynced: listings.filter((l) => l.stock > 0).length,
    ordersSynced: orders.length,
    webhooksProcessed: webhookEvents.length,
    checkedAt: new Date().toISOString(),
  };
}

export async function checkAllMarketplaceHealth(): Promise<MarketplaceHealth[]> {
  const { listMarketplaces } = await import("./registry");
  const mps = listMarketplaces();
  return Promise.all(mps.map((mp) => checkMarketplaceHealth(mp.marketplaceId)));
}
