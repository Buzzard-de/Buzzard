import engineExtensions from "@/data/global/market_engine_extensions.json";
import { getMarket } from "./registry";

const supplierFallbacks = (engineExtensions as {
  supplierFallbacks: Record<string, string[]>;
}).supplierFallbacks;

export type SupplierRegion = "EU" | "GCC" | "MENA" | "TR" | string;

/**
 * Preferred supplier regions for a market — routing preference only, no supplier selection.
 */
export function getEligibleSupplierRegions(countryCode: string): SupplierRegion[] {
  const market = getMarket(countryCode);
  if (!market) return ["EU"];

  const primary = market.supplierRegion;
  const fallbacks = supplierFallbacks[primary] ?? supplierFallbacks.NON_EU ?? ["EU"];

  const ordered = [primary, ...fallbacks.filter((r) => r !== primary)];
  return [...new Set(ordered)];
}

export function getSupplierRegion(countryCode: string): SupplierRegion {
  return getMarket(countryCode)?.supplierRegion ?? "EU";
}
