import type { BuzzardLocale } from "@/lib/i18n/types";
import { formatPrice as formatPriceIntl } from "@/lib/i18n/format";
import { getRuntimeLocale } from "@/lib/i18n/runtime";
import { translate } from "@/lib/i18n/translations";
import type { StockStatus } from "./types";

export function formatPrice(price: number, currency = "EUR", locale?: BuzzardLocale): string {
  return formatPriceIntl(price, locale ?? getRuntimeLocale(), currency);
}

export function formatVatInfo(price: number, vatRate: number, locale?: BuzzardLocale): string {
  const activeLocale = locale ?? getRuntimeLocale();
  const net = price / (1 + vatRate / 100);
  const vatLabel = translate(activeLocale, "cart.vat");
  return `${vatLabel} (${formatPrice(price - net, "EUR", activeLocale)})`;
}

export function stockStatusLabel(status: StockStatus, locale?: BuzzardLocale): string {
  const activeLocale = locale ?? getRuntimeLocale();
  return translate(activeLocale, `product.stock.${status}`);
}

export const FREE_SHIPPING_THRESHOLD = 79;

export function getShippingCost(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : 5.99;
}
