import { getDeliverableMarketCountry } from "./countries";

export function getMarketTaxRate(countryCode: string): number {
  return getDeliverableMarketCountry(countryCode)?.taxRate ?? 0.19;
}

/** Display estimate for destination VAT layer (v0.2 commerce model). */
export function estimateDestinationTax(subtotal: number, countryCode: string): number {
  if (subtotal <= 0) return 0;
  return Math.round(subtotal * getMarketTaxRate(countryCode) * 100) / 100;
}

export function formatTaxRatePercent(countryCode: string): string {
  return `${Math.round(getMarketTaxRate(countryCode) * 1000) / 10}%`;
}
