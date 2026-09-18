import { getMarket } from "@/lib/market-engine/registry";
import type { TargetCountryResolution } from "./types";

const COUNTRY_CODE_RE = /^[A-Z]{2}$/;

export function normalizeCountryCode(raw: string | undefined | null): string | null {
  const code = String(raw ?? "")
    .trim()
    .toUpperCase();
  if (!COUNTRY_CODE_RE.test(code)) return null;
  return code;
}

export function isKnownMarketCountry(countryCode: string): boolean {
  return Boolean(getMarket(countryCode));
}

/**
 * Server-authoritative destination country resolution.
 * Priority: shippingAddress.country → validated checkout country → market context.
 * Never silently accepts market/shipping mismatch.
 */
export function resolveTargetCountry(input: {
  shippingAddressCountry: string;
  marketId: string;
  validatedCheckoutCountry?: string;
}): TargetCountryResolution {
  const marketId = normalizeCountryCode(input.marketId);
  const shippingCountry = normalizeCountryCode(input.shippingAddressCountry);
  const checkoutCountry = input.validatedCheckoutCountry
    ? normalizeCountryCode(input.validatedCheckoutCountry)
    : null;

  if (!marketId || !isKnownMarketCountry(marketId)) {
    return {
      ok: false,
      errorCode: "INVALID_COUNTRY",
      errorMessage: "INVALID_MARKET",
      marketId: input.marketId,
    };
  }

  const shippingProvided = Boolean(String(input.shippingAddressCountry ?? "").trim());
  if (shippingProvided) {
    if (!shippingCountry || !isKnownMarketCountry(shippingCountry)) {
      return {
        ok: false,
        errorCode: "INVALID_COUNTRY",
        errorMessage: "INVALID_SHIPPING_COUNTRY",
        marketId,
        shippingCountry: shippingCountry ?? undefined,
      };
    }
    if (shippingCountry !== marketId) {
      return {
        ok: false,
        errorCode: "TRADE_ROUTE_COUNTRY_MISMATCH",
        errorMessage: "TRADE_ROUTE_COUNTRY_MISMATCH",
        marketId,
        shippingCountry,
      };
    }
    return { ok: true, country: shippingCountry, source: "shipping_address", marketId, shippingCountry };
  }

  if (checkoutCountry && isKnownMarketCountry(checkoutCountry)) {
    if (checkoutCountry !== marketId) {
      return {
        ok: false,
        errorCode: "TRADE_ROUTE_COUNTRY_MISMATCH",
        errorMessage: "TRADE_ROUTE_COUNTRY_MISMATCH",
        marketId,
        shippingCountry: checkoutCountry,
      };
    }
    return { ok: true, country: checkoutCountry, source: "checkout", marketId, shippingCountry: checkoutCountry };
  }

  if (isKnownMarketCountry(marketId)) {
    return { ok: true, country: marketId, source: "market", marketId, shippingCountry: shippingCountry ?? undefined };
  }

  return {
    ok: false,
    errorCode: "INVALID_COUNTRY",
    errorMessage: "INVALID_DESTINATION_COUNTRY",
    marketId,
    shippingCountry: shippingCountry ?? undefined,
  };
}
