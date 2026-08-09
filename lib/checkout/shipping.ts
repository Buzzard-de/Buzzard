import {
  calculateMarketShipping,
  freeShippingRemaining as marketFreeShippingRemaining,
  getFreeShippingThreshold,
} from "@/lib/market/shipping";
import { defaultMarketCountryCode } from "@/lib/market/countries";
import type { ShippingMethodOption } from "./types";

export const FREE_SHIPPING_THRESHOLD = 79;
export const STANDARD_SHIPPING_COST = 5.99;

export const SHIPPING_METHODS: ShippingMethodOption[] = [
  {
    id: "standard",
    labelKey: "checkout.shippingStandard",
    descriptionKey: "checkout.shippingStandardDesc",
    baseCost: STANDARD_SHIPPING_COST,
    etaDays: "2-4",
  },
  {
    id: "express",
    labelKey: "checkout.shippingExpress",
    descriptionKey: "checkout.shippingExpressDesc",
    baseCost: 12.99,
    etaDays: "1-2",
  },
];

export function getShippingMethod(id: string): ShippingMethodOption | undefined {
  return SHIPPING_METHODS.find((m) => m.id === id);
}

export function calculateShippingCost(
  subtotal: number,
  methodId: string,
  countryCode = defaultMarketCountryCode(),
  weightKg = 2
): number {
  if (subtotal <= 0) return 0;

  const standard = calculateMarketShipping(countryCode, weightKg, subtotal);
  if (methodId === "standard") return standard;

  const method = getShippingMethod(methodId) ?? SHIPPING_METHODS[0];
  if (method.id === "express") {
    return standard > 0 ? standard + (method.baseCost - SHIPPING_METHODS[0].baseCost) : method.baseCost;
  }

  return method.baseCost;
}

export function freeShippingRemaining(
  subtotal: number,
  countryCode = defaultMarketCountryCode()
): number {
  return marketFreeShippingRemaining(subtotal, countryCode);
}

export { getFreeShippingThreshold };
