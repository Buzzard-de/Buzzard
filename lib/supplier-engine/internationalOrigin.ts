import { isEuCountry } from "@/lib/market-engine/registry";
import { normalizeCountryCode, isKnownMarketCountry } from "@/lib/market-engine/countryCode";
import type { SupplierConfig } from "./types";

export interface SupplierInternationalProfile {
  supplierId: string;
  supplierCountry?: string;
  warehouseCountries: string[];
  fulfillmentCountries: string[];
  shippingOrigins: string[];
  euMemberState?: boolean;
  internationalShippingSupported: boolean;
  dropshippingSupported: boolean;
  blindShippingSupported: boolean;
  whiteLabelSupported: boolean;
}

function normalizeCountryList(values?: string[]): string[] {
  if (!values?.length) return [];
  const out: string[] = [];
  for (const raw of values) {
    const code = normalizeCountryCode(raw);
    if (code && isKnownMarketCountry(code) && !out.includes(code)) out.push(code);
  }
  return out;
}

/**
 * Derive international supplier profile from Supplier Engine SSOT.
 * UNKNOWN is never interpreted as EU.
 */
export function buildSupplierInternationalProfile(
  supplier: Pick<
    SupplierConfig,
    | "supplierId"
    | "country"
    | "supplierCountry"
    | "warehouseCountries"
    | "fulfillmentCountries"
    | "shippingOrigins"
    | "euMemberState"
    | "internationalShippingSupported"
    | "dropshippingSupported"
    | "blindShippingSupported"
    | "whiteLabelSupported"
    | "capabilities"
  >,
): SupplierInternationalProfile {
  const supplierCountry =
    normalizeCountryCode(supplier.supplierCountry) ??
    normalizeCountryCode(supplier.country) ??
    undefined;

  const warehouseCountries = normalizeCountryList(supplier.warehouseCountries);
  const fulfillmentCountries = normalizeCountryList(supplier.fulfillmentCountries);
  const shippingOrigins = normalizeCountryList(supplier.shippingOrigins);

  const euMemberState =
    supplier.euMemberState ??
    (supplierCountry ? isEuCountry(supplierCountry) : undefined);

  return {
    supplierId: supplier.supplierId,
    supplierCountry,
    warehouseCountries,
    fulfillmentCountries,
    shippingOrigins,
    euMemberState,
    internationalShippingSupported: supplier.internationalShippingSupported ?? true,
    dropshippingSupported:
      supplier.dropshippingSupported ?? supplier.capabilities?.dropshipping === true,
    blindShippingSupported:
      supplier.blindShippingSupported ?? supplier.capabilities?.blindShipping === true,
    whiteLabelSupported:
      supplier.whiteLabelSupported ?? supplier.capabilities?.whiteLabel === true,
  };
}

export function resolveSupplierOriginCountry(profile: SupplierInternationalProfile): {
  originCountry?: string;
  source?: "shippingOrigins" | "warehouseCountries" | "fulfillmentCountries" | "supplierCountry";
} {
  if (profile.shippingOrigins[0]) {
    return { originCountry: profile.shippingOrigins[0], source: "shippingOrigins" };
  }
  if (profile.warehouseCountries[0]) {
    return { originCountry: profile.warehouseCountries[0], source: "warehouseCountries" };
  }
  if (profile.fulfillmentCountries[0]) {
    return { originCountry: profile.fulfillmentCountries[0], source: "fulfillmentCountries" };
  }
  if (profile.supplierCountry && isKnownMarketCountry(profile.supplierCountry)) {
    return { originCountry: profile.supplierCountry, source: "supplierCountry" };
  }
  return {};
}
