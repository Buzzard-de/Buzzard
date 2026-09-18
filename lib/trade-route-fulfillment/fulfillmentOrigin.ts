import { normalizeCountryCode, isKnownMarketCountry } from "./targetCountry";
import type { FulfillmentOriginResolution, FulfillmentOriginSource } from "./types";

type OriginCandidate = { country: string; source: FulfillmentOriginSource };

function pickOrigin(supplier: {
  shippingOrigin?: string;
  warehouseCountry?: string;
  fulfillmentCountry?: string;
  supplierCountry?: string;
  country?: string;
}): OriginCandidate | null {
  const candidates: Array<{ value?: string; source: FulfillmentOriginSource }> = [
    { value: supplier.shippingOrigin, source: "shippingOrigin" },
    { value: supplier.warehouseCountry, source: "warehouseCountry" },
    { value: supplier.fulfillmentCountry, source: "fulfillmentCountry" },
    { value: supplier.supplierCountry, source: "supplierCountry" },
    { value: supplier.country, source: "supplier.country" },
  ];

  for (const candidate of candidates) {
    const normalized = normalizeCountryCode(candidate.value);
    if (normalized && isKnownMarketCountry(normalized)) {
      return { country: normalized, source: candidate.source };
    }
  }
  return null;
}

/**
 * Resolve supplier fulfillment origin from explicit supplier metadata.
 * Does not default to DE when origin is unknown.
 */
export function resolveFulfillmentOrigin(input: {
  supplier: {
    supplierId: string;
    country?: string;
    region?: string;
    shippingOrigin?: string;
    warehouseCountry?: string;
    fulfillmentCountry?: string;
    supplierCountry?: string;
  };
}): FulfillmentOriginResolution {
  const picked = pickOrigin(input.supplier);
  if (!picked) {
    return {
      ok: false,
      errorCode: "ORIGIN_UNKNOWN",
      errorMessage: "ORIGIN_UNKNOWN",
    };
  }
  return {
    ok: true,
    originCountry: picked.country,
    source: picked.source,
  };
}
