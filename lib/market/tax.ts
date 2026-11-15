import { getDeliverableMarketCountry } from "./countries";

/**
 * Checkout must not use an overlay label or the removed 19 percent fallback.
 * A missing country, a missing rate, and an unverified snapshot all stay null.
 */
export function getMarketTaxRate(countryCode: string): number | null {
  getDeliverableMarketCountry(countryCode);
  return null;
}

/** Destination VAT is not calculated until an official, verified rate exists. */
export function estimateDestinationTax(_subtotal: number, countryCode: string): number | null {
  getMarketTaxRate(countryCode);
  return null;
}

export function formatTaxRatePercent(countryCode: string): string {
  getMarketTaxRate(countryCode);
  return "UNKNOWN";
}
