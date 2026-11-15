import type { BuzzardLocale } from "@/lib/i18n/types";
import { formatPrice as formatPriceIntl } from "@/lib/i18n/format";
import { getRuntimeLocale } from "@/lib/i18n/runtime";
import { translate } from "@/lib/i18n/translations";
import type { StockStatus } from "./types";

export function formatPrice(price: number, currency = "EUR", locale?: BuzzardLocale): string {
  return formatPriceIntl(price, locale ?? getRuntimeLocale(), currency);
}

export function formatVatInfo(price: number, vatRate: number | null, locale?: BuzzardLocale): string {
  const activeLocale = locale ?? getRuntimeLocale();
  void price;
  void vatRate;
  return `${translate(activeLocale, "cart.vat")} UNKNOWN`;
}

export function stockStatusLabel(status: StockStatus, locale?: BuzzardLocale): string {
  const activeLocale = locale ?? getRuntimeLocale();
  return translate(activeLocale, `product.stock.${status}`);
}

export const FREE_SHIPPING_THRESHOLD = 79;

export function getShippingCost(_subtotal: number): number | null {
  return null;
}
