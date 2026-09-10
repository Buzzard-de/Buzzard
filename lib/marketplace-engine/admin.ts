import { checkMarketplaceHealth } from "./health";
import {
  getMarketplace,
  listListings,
  listMarketplaces,
  listOrderMappings,
  listReturnRecords,
  listSyncJobs,
} from "./registry";
import type { MarketplaceEngineAdminRow } from "./types";

export async function buildMarketplaceAdminRow(marketplaceId: string): Promise<MarketplaceEngineAdminRow | undefined> {
  const mp = getMarketplace(marketplaceId);
  if (!mp) return undefined;

  const listings = listListings(marketplaceId);
  const health = await checkMarketplaceHealth(marketplaceId);
  const syncJobs = listSyncJobs(marketplaceId);
  const lastSync = syncJobs
    .filter((j) => j.status === "COMPLETED")
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))[0];

  const capabilities = Object.entries(mp.capabilities)
    .filter(([, v]) => v)
    .map(([k]) => k);

  return {
    marketplaceId: mp.marketplaceId,
    displayName: mp.displayName,
    status: mp.status,
    markets: mp.supportedMarkets,
    capabilities,
    activeListings: listings.filter((l) => l.status === "ACTIVE").length,
    errorListings: listings.filter((l) => l.status === "ERROR" || l.status === "REVIEW_REQUIRED").length,
    lastSync: lastSync?.completedAt,
    healthStatus: health.lastError ? "DEGRADED" : "OK",
    ordersImported: listOrderMappings(marketplaceId).length,
    returnsPending: listReturnRecords(marketplaceId).filter((r) => r.status === "REQUESTED").length,
  };
}

export async function getMarketplaceAdminOverview(): Promise<MarketplaceEngineAdminRow[]> {
  const rows = await Promise.all(listMarketplaces().map((mp) => buildMarketplaceAdminRow(mp.marketplaceId)));
  return rows.filter((r): r is MarketplaceEngineAdminRow => r != null);
}

export function getMarketplaceAdminDetail(marketplaceId: string) {
  const mp = getMarketplace(marketplaceId);
  if (!mp) return null;
  return {
    ...mp,
    listings: listListings(marketplaceId),
    orders: listOrderMappings(marketplaceId),
    returns: listReturnRecords(marketplaceId),
    syncJobs: listSyncJobs(marketplaceId),
  };
}
