import { marketShippingRules } from "./source";

export function getMarketShippingRules(countryCode: string) {
  return marketShippingRules[countryCode] ?? marketShippingRules.DEFAULT;
}

export function getFreeShippingThreshold(): number | null {
  return null;
}

export function calculateMarketShipping(): number | null {
  return null;
}

export function freeShippingRemaining(): number | null {
  return null;
}
