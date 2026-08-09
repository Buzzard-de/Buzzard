import { marketShippingRules } from "./source";
import { defaultMarketCountryCode } from "./countries";

export function getMarketShippingRules(countryCode: string) {
  return marketShippingRules[countryCode] ?? marketShippingRules.DEFAULT;
}

export function getFreeShippingThreshold(countryCode = defaultMarketCountryCode()): number {
  return getMarketShippingRules(countryCode).freeShippingFrom ?? 79;
}

export function calculateMarketShipping(
  countryCode: string,
  weightKg: number,
  subtotal: number
): number {
  const rules = getMarketShippingRules(countryCode);
  if (subtotal <= 0) return 0;
  if (rules.freeShippingFrom && subtotal >= rules.freeShippingFrom) return 0;

  const tier =
    rules.rates.find((rate) => weightKg <= rate.maxKg) ?? rules.rates.at(-1);
  return tier?.price ?? 0;
}

export function freeShippingRemaining(subtotal: number, countryCode = defaultMarketCountryCode()): number {
  const threshold = getFreeShippingThreshold(countryCode);
  if (subtotal >= threshold) return 0;
  return Math.max(0, threshold - subtotal);
}
