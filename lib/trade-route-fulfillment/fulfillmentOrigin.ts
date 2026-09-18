import {
  buildSupplierInternationalProfile,
  resolveSupplierOriginCountry,
} from "@/lib/supplier-engine/internationalOrigin";
import { normalizeCountryCode, isKnownMarketCountry } from "./targetCountry";
import type { FulfillmentOriginResolution, FulfillmentOriginSource } from "./types";

const SOURCE_MAP: Record<string, FulfillmentOriginSource> = {
  shippingOrigins: "shippingOrigin",
  warehouseCountries: "warehouseCountry",
  fulfillmentCountries: "fulfillmentCountry",
  supplierCountry: "supplierCountry",
};

/**
 * Resolve supplier fulfillment origin from Supplier Engine SSOT.
 * Does not default to DE when origin is unknown.
 */
export function resolveFulfillmentOrigin(input: {
  supplier: {
    supplierId: string;
    country?: string;
    region?: string;
    supplierCountry?: string;
    warehouseCountries?: string[];
    fulfillmentCountries?: string[];
    shippingOrigins?: string[];
    euMemberState?: boolean;
    internationalShippingSupported?: boolean;
    dropshippingSupported?: boolean;
    blindShippingSupported?: boolean;
    whiteLabelSupported?: boolean;
    capabilities?: {
      dropshipping?: boolean;
      blindShipping?: boolean;
      whiteLabel?: boolean;
    };
    shippingOrigin?: string;
    warehouseCountry?: string;
    fulfillmentCountry?: string;
  };
}): FulfillmentOriginResolution {
  const profile = buildSupplierInternationalProfile({
    supplierId: input.supplier.supplierId,
    country: input.supplier.country ?? "UNKNOWN",
    supplierCountry: input.supplier.supplierCountry,
    warehouseCountries:
      input.supplier.warehouseCountries ??
      (input.supplier.warehouseCountry ? [input.supplier.warehouseCountry] : undefined),
    fulfillmentCountries:
      input.supplier.fulfillmentCountries ??
      (input.supplier.fulfillmentCountry ? [input.supplier.fulfillmentCountry] : undefined),
    shippingOrigins:
      input.supplier.shippingOrigins ??
      (input.supplier.shippingOrigin ? [input.supplier.shippingOrigin] : undefined),
    euMemberState: input.supplier.euMemberState,
    internationalShippingSupported: input.supplier.internationalShippingSupported,
    dropshippingSupported: input.supplier.dropshippingSupported,
    blindShippingSupported: input.supplier.blindShippingSupported,
    whiteLabelSupported: input.supplier.whiteLabelSupported,
    capabilities: input.supplier.capabilities ?? {},
  });

  const resolved = resolveSupplierOriginCountry(profile);
  if (resolved.originCountry) {
    return {
      ok: true,
      originCountry: resolved.originCountry,
      source: resolved.source ? SOURCE_MAP[resolved.source] : "supplierCountry",
    };
  }

  // Legacy single-field fallbacks (test overrides only)
  const legacy = [
    input.supplier.shippingOrigin,
    input.supplier.warehouseCountry,
    input.supplier.fulfillmentCountry,
    input.supplier.supplierCountry,
    input.supplier.country,
  ];
  for (const value of legacy) {
    const normalized = normalizeCountryCode(value);
    if (normalized && isKnownMarketCountry(normalized)) {
      return { ok: true, originCountry: normalized, source: "supplierCountry" };
    }
  }

  return {
    ok: false,
    errorCode: "ORIGIN_UNKNOWN",
    errorMessage: "ORIGIN_UNKNOWN",
  };
}
