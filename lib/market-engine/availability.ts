import { isMarketActive } from "./registry";
import type { ProductAvailabilityInput, ProductAvailabilityResult } from "./types";

function normalizeAvailabilityMap(countryAvailability: Record<string, boolean> = {}): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const [code, value] of Object.entries(countryAvailability)) {
    map[String(code).toUpperCase()] = Boolean(value);
  }
  return map;
}

/**
 * Product availability in a market — architecture for future category/supplier/legal checks.
 */
export function isProductAvailableInMarket(
  product: ProductAvailabilityInput,
  countryCode: string
): ProductAvailabilityResult {
  const code = String(countryCode || "").toUpperCase();

  if (!isMarketActive(code)) {
    return { available: false, status: "MARKET_DISABLED", reason: "MARKET_NOT_ACTIVE" };
  }

  const availability = normalizeAvailabilityMap(product.countryAvailability);

  if (!Object.keys(availability).length) {
    return { available: false, status: "REVIEW_REQUIRED", reason: "UNKNOWN_COUNTRY_AVAILABILITY" };
  }

  if (!(code in availability)) {
    return { available: false, status: "REVIEW_REQUIRED", reason: "COUNTRY_NOT_DEFINED" };
  }

  if (!availability[code]) {
    return { available: false, status: "BLOCKED", reason: "COUNTRY_RESTRICTED" };
  }

  const restrictions = product.countryRestrictions ?? {};
  if (restrictions[code]) {
    return { available: false, status: "BLOCKED", reason: "COUNTRY_RESTRICTED" };
  }

  if (product.stockStatus === "out_of_stock") {
    return { available: false, status: "BLOCKED", reason: "OUT_OF_STOCK" };
  }

  return { available: true, status: "AVAILABLE", reason: null };
}
