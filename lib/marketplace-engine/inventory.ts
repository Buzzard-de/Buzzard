import { getStockRecord } from "@/lib/inventory-engine";
import { calculateSaleableQuantity } from "@/lib/inventory-engine/stock";
import { getStockPolicy } from "./registry";
import type { ListingStatus } from "./types";

export interface MarketplaceStockResult {
  saleableQuantity: number;
  publishedQuantity: number;
  listingStatus: ListingStatus;
}

export function getMarketplaceStock(input: {
  productId: string;
  supplierId: string;
  supplierOfferId: string;
  marketplaceId: string;
}): MarketplaceStockResult {
  const record = getStockRecord(input.productId, input.supplierId, input.supplierOfferId);
  if (!record) {
    return { saleableQuantity: 0, publishedQuantity: 0, listingStatus: "OUT_OF_STOCK" };
  }

  const saleable = calculateSaleableQuantity({
    availableQuantity: record.quantity,
    stockBuffer: record.stockBuffer ?? { type: "absolute", value: 0 },
    reservedQuantity: record.reservedQuantity ?? 0,
    isStale: record.stockStatus === "STALE",
    manuallyDiscontinued: record.manuallyDiscontinued,
    stockStatus: record.stockStatus,
  });

  const policy = getStockPolicy(input.marketplaceId);
  let published = saleable;

  if (policy.stockBuffer != null) {
    published = Math.max(0, published - policy.stockBuffer);
  }
  if (policy.maxPublishedQuantity != null) {
    published = Math.min(published, policy.maxPublishedQuantity);
  }
  if (policy.minPublishedQuantity != null && published > 0) {
    published = Math.max(published, policy.minPublishedQuantity);
  }

  const listingStatus: ListingStatus = published <= 0 ? "OUT_OF_STOCK" : "ACTIVE";

  return {
    saleableQuantity: saleable,
    publishedQuantity: published,
    listingStatus,
  };
}
