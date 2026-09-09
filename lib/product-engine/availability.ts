import { isProductAvailableInMarket as marketAvailabilityCheck } from "@/lib/market-engine/availability";
import { getEligibleSupplierRegions } from "@/lib/market-engine/supplier";
import type { MarketAvailabilityEntry, ProductEngineProduct } from "./types";

export function setMarketAvailability(
  product: ProductEngineProduct,
  countryCode: string,
  status: MarketAvailabilityEntry["status"],
  reason?: string
): ProductEngineProduct {
  const code = countryCode.toUpperCase();
  const existing = product.availability.filter((a) => a.countryCode !== code);
  return {
    ...product,
    availability: [...existing, { countryCode: code, status, reason }],
    updatedAt: new Date().toISOString(),
  };
}

export function isProductAvailableInMarket(
  product: ProductEngineProduct,
  countryCode: string
): { available: boolean; status: string; reason: string | null } {
  const code = countryCode.toUpperCase();
  const entry = product.availability.find((a) => a.countryCode === code);

  if (entry?.status === "DISABLED") {
    return { available: false, status: "BLOCKED", reason: entry.reason || "MARKET_DISABLED" };
  }

  if (entry?.status === "REVIEW_REQUIRED") {
    return { available: false, status: "REVIEW_REQUIRED", reason: entry.reason || "MARKET_REVIEW" };
  }

  const countryMap = Object.fromEntries(
    product.availability
      .filter((a) => a.status === "ACTIVE")
      .map((a) => [a.countryCode, true])
  );

  if (product.availability.length > 0) {
    if (!(code in countryMap) && !entry) {
      return { available: false, status: "REVIEW_REQUIRED", reason: "COUNTRY_NOT_DEFINED" };
    }
  }

  const marketResult = marketAvailabilityCheck(
    {
      countryAvailability: Object.keys(countryMap).length ? countryMap : { DE: true, FR: true },
      stockStatus: product.stock.availability === "OUT_OF_STOCK" ? "out_of_stock" : "in_stock",
      supplierRegion: getEligibleSupplierRegions(code)[0],
    },
    code
  );

  if (product.status === "DISCONTINUED" || product.status === "ARCHIVED") {
    return { available: false, status: "BLOCKED", reason: "PRODUCT_DISCONTINUED" };
  }

  return marketResult;
}

export function getActiveMarkets(product: ProductEngineProduct): string[] {
  return product.availability.filter((a) => a.status === "ACTIVE").map((a) => a.countryCode);
}
