import { getDeliverableMarketCountry } from "./countries";

export function getMarketTaxRate(countryCode: string): number | null {
  const rate = getDeliverableMarketCountry(countryCode)?.taxRate;
  return Number.isFinite(Number(rate)) ? Number(rate) : null;
}

/** Display estimate for destination VAT layer (v0.2 commerce model). */
export function estimateDestinationTax(subtotal: number, countryCode: string): number | null {
  const rate = getMarketTaxRate(countryCode);
  if (rate == null || subtotal <= 0) return rate == null ? null : 0;
  return Math.round(subtotal * rate * 100) / 100;
}

export function formatTaxRatePercent(countryCode: string): string | null {
  const rate = getMarketTaxRate(countryCode);
  if (rate == null) return null;
  return `${Math.round(rate * 1000) / 10}%`;
}
