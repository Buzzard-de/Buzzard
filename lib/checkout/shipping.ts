import type { CheckoutCartLineInput, ShippingMethodOption } from "./types";

export const STANDARD_SHIPPING_COST = null;

export const SHIPPING_METHODS: ShippingMethodOption[] = [
  {
    id: "standard",
    labelKey: "checkout.shippingStandard",
    descriptionKey: "checkout.shippingStandardDesc",
    baseCost: null,
    etaDays: "UNKNOWN",
  },
  {
    id: "express",
    labelKey: "checkout.shippingExpress",
    descriptionKey: "checkout.shippingExpressDesc",
    baseCost: null,
    etaDays: "UNKNOWN",
  },
];

export function getShippingMethod(id: string): ShippingMethodOption | undefined {
  return SHIPPING_METHODS.find((method) => method.id === id);
}

export function calculateShippingCost(): number | null {
  return null;
}

export function calculateShippingCostForLines(): number | null {
  return null;
}

export function freeShippingRemaining(): number | null {
  return null;
}

export function getFreeShippingThreshold(): number | null {
  return null;
}

export type { CheckoutCartLineInput };
