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
  methodId: string
): number {
  if (subtotal <= 0) return 0;
  const method = getShippingMethod(methodId) ?? SHIPPING_METHODS[0];
  if (subtotal >= FREE_SHIPPING_THRESHOLD && method.id === "standard") {
    return 0;
  }
  return method.baseCost;
}

export function freeShippingRemaining(subtotal: number): number {
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  return Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
}
