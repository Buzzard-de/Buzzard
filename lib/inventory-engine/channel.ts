import { getSupportedChannels } from "./registry";
import type {
  ChannelAvailabilityEntry,
  ChannelAvailabilityStatus,
  InventoryChannel,
  SupplierStockRecord,
} from "./types";
import { computeMarketAvailability } from "./market";

export function computeChannelAvailability(
  record: SupplierStockRecord,
  channel: InventoryChannel,
  marketId = "DE"
): { available: boolean; status: ChannelAvailabilityStatus; reason?: string } {
  if (record.manuallyPaused) {
    return { available: false, status: "PAUSED", reason: "OFFER_PAUSED" };
  }

  if (record.manuallyDiscontinued || record.stockStatus === "DISCONTINUED") {
    return { available: false, status: "DISCONTINUED", reason: "DISCONTINUED" };
  }

  const marketResult = computeMarketAvailability(record, marketId);
  if (!marketResult.available) {
    if (marketResult.status === "STALE") return { available: false, status: "STALE", reason: marketResult.reason };
    if (marketResult.reason === "SUPPLIER_MARKET_UNSUPPORTED") {
      return { available: false, status: "MARKET_UNSUPPORTED", reason: marketResult.reason };
    }
    if (record.saleableQuantity <= 0) {
      return { available: false, status: "OUT_OF_STOCK", reason: "NO_SALEABLE_STOCK" };
    }
    return { available: false, status: "SUPPLIER_UNAVAILABLE", reason: marketResult.reason };
  }

  if (record.isStale) {
    return { available: false, status: "STALE", reason: "STALE_STOCK" };
  }

  if (record.saleableQuantity <= 0) {
    return { available: false, status: "OUT_OF_STOCK", reason: "NO_SALEABLE_STOCK" };
  }

  return { available: true, status: "ACTIVE" };
}

export function updateChannelAvailabilityForRecord(
  record: SupplierStockRecord,
  marketId = "DE"
): ChannelAvailabilityEntry[] {
  const now = new Date().toISOString();
  return getSupportedChannels().map((channel) => {
    const result = computeChannelAvailability(record, channel, marketId);
    return {
      channel,
      status: result.status,
      reason: result.reason,
      updatedAt: now,
    };
  });
}
