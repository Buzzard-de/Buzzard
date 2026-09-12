import { getMarket, getMarketLanguages } from "@/lib/market-engine/registry";
import { getRegistryProduct } from "@/lib/product-engine/registry";
import type { AnalyticsEventInput } from "./types";
import { FOUNDATION_EVENT_TYPES } from "./constants";

export function validateEventSchema(input: AnalyticsEventInput): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.eventType) errors.push("MISSING_EVENT_TYPE");
  else if (!FOUNDATION_EVENT_TYPES.includes(input.eventType)) errors.push("INVALID_EVENT_TYPE");

  if (input.timestamp) {
    const ts = Date.parse(input.timestamp);
    if (Number.isNaN(ts)) errors.push("INVALID_TIMESTAMP");
  }

  if (input.market) {
    const market = getMarket(input.market.toUpperCase());
    if (!market) errors.push("INVALID_MARKET");
  }

  if (input.language && input.market) {
    const langs = getMarketLanguages(input.market.toUpperCase());
    const base = input.language.split("-")[0];
    if (!langs.includes(base) && !langs.includes(input.language)) {
      errors.push("INVALID_LANGUAGE");
    }
  }

  if (input.productId && !getRegistryProduct(input.productId)) {
    errors.push("INVALID_PRODUCT_ID");
  }

  if (input.value !== undefined && (typeof input.value !== "number" || input.value < 0)) {
    errors.push("INVALID_VALUE");
  }

  if (input.quantity !== undefined && (!Number.isInteger(input.quantity) || input.quantity < 0)) {
    errors.push("INVALID_QUANTITY");
  }

  return { ok: errors.length === 0, errors };
}
