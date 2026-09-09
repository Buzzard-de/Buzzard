import { getMarket } from "@/lib/market-engine/registry";
import { getEligibleSupplierRegions } from "@/lib/market-engine/supplier";
import { getSupplier } from "@/lib/supplier-engine/registry";
import type { MarketAvailabilityEntry, MarketAvailabilityStatus, SupplierStockRecord } from "./types";

export function computeMarketAvailability(
  record: SupplierStockRecord,
  marketId: string
): { available: boolean; status: MarketAvailabilityStatus; reason?: string } {
  const market = getMarket(marketId);
  if (!market) {
    return { available: false, status: "DISABLED", reason: "UNKNOWN_MARKET" };
  }

  const supplier = getSupplier(record.supplierId);
  if (supplier?.supportedMarkets?.length && !supplier.supportedMarkets.includes(marketId)) {
    return { available: false, status: "DISABLED", reason: "SUPPLIER_MARKET_UNSUPPORTED" };
  }

  const existing = record.marketAvailability.find((m) => m.marketId === marketId);
  if (existing?.status === "DISABLED") {
    return { available: false, status: "DISABLED", reason: existing.reason };
  }

  if (record.manuallyDiscontinued || record.stockStatus === "DISCONTINUED") {
    return { available: false, status: "OUT_OF_STOCK", reason: "DISCONTINUED" };
  }

  if (record.isStale) {
    return { available: false, status: "STALE", reason: "STALE_STOCK" };
  }

  if (record.saleableQuantity <= 0) {
    return { available: false, status: "OUT_OF_STOCK", reason: "NO_SALEABLE_STOCK" };
  }

  const regions = getEligibleSupplierRegions(marketId);
  if (supplier?.region && regions.length && !regions.includes(supplier.region)) {
    return { available: false, status: "REVIEW_REQUIRED", reason: "SHIPPING_ROUTE_UNSUPPORTED" };
  }

  return { available: true, status: "ACTIVE" };
}

export function updateMarketAvailabilityForRecord(
  record: SupplierStockRecord,
  marketIds: string[]
): MarketAvailabilityEntry[] {
  const now = new Date().toISOString();
  return marketIds.map((marketId) => {
    const result = computeMarketAvailability(record, marketId);
    return {
      marketId,
      status: result.status,
      reason: result.reason,
      updatedAt: now,
    };
  });
}
