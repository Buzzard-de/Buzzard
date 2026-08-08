import type { StockStatus } from "./types";

export function formatPrice(price: number, currency = "EUR"): string {
  if (currency === "EUR") {
    return price.toFixed(2).replace(".", ",") + " €";
  }
  return `${price.toFixed(2)} ${currency}`;
}

export function formatVatInfo(price: number, vatRate: number): string {
  const net = price / (1 + vatRate / 100);
  return `inkl. ${vatRate} % MwSt. (${formatPrice(price - net)} MwSt.)`;
}

export function stockStatusLabel(status: StockStatus): string {
  switch (status) {
    case "in_stock":
      return "Auf Lager";
    case "low_stock":
      return "Nur noch wenige verfügbar";
    case "out_of_stock":
      return "Nicht verfügbar";
    case "preorder":
      return "Vorbestellung";
    default:
      return status;
  }
}

export const FREE_SHIPPING_THRESHOLD = 79;

export function getShippingCost(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : 5.99;
}
