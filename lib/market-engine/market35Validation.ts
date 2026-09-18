import { getMarket, listMarkets, validateMarketRegistry } from "./registry";
import { getMarketLanguages } from "./registry";
import { getMarketVat, getMarketShippingRegion } from "./registry";
import { getMarketPaymentRegion } from "./registry";

export interface Market35Check {
  countryCode: string;
  locale: boolean;
  language: boolean;
  currency: boolean;
  vat: boolean;
  shipping: boolean;
  payment: boolean;
  ok: boolean;
  errors: string[];
}

/**
 * Validate all 35 Buzzard markets against Market Engine SSOT.
 * Does not duplicate country list — uses global_countries_35.json via registry.
 */
export function validateAll35Markets(): {
  valid: boolean;
  count: number;
  markets: Market35Check[];
  errors: string[];
} {
  const registry = validateMarketRegistry();
  const markets = listMarkets();
  const checks: Market35Check[] = [];

  for (const market of markets) {
    const code = market.countryCode;
    const errors: string[] = [];
    const m = getMarket(code);
    if (!m) errors.push("MISSING_MARKET_CONFIG");
    if (!m?.locales?.length) errors.push("MISSING_LOCALE");
    if (!getMarketLanguages(code).length) errors.push("MISSING_LANGUAGE");
    if (!m?.currency) errors.push("MISSING_CURRENCY");
    if (!getMarketVat(code)) errors.push("MISSING_VAT");
    if (!getMarketShippingRegion(code)) errors.push("MISSING_SHIPPING_REGION");
    if (!getMarketPaymentRegion(code)) errors.push("MISSING_PAYMENT_REGION");

    checks.push({
      countryCode: code,
      locale: Boolean(m?.locales?.length),
      language: getMarketLanguages(code).length > 0,
      currency: Boolean(m?.currency),
      vat: Boolean(getMarketVat(code)),
      shipping: Boolean(getMarketShippingRegion(code)),
      payment: Boolean(getMarketPaymentRegion(code)),
      ok: errors.length === 0,
      errors,
    });
  }

  return {
    valid: registry.valid && checks.every((c) => c.ok),
    count: checks.length,
    markets: checks,
    errors: registry.errors,
  };
}
