import { isEuCountry } from "@/lib/market-engine/registry";
import { validateAll35Markets } from "@/lib/market-engine/market35Validation";
import { classifyTradeRoute } from "@/lib/trade-route-fulfillment/tradeRoute";
import { CARRIER_PROFILES } from "@/lib/trade-route-fulfillment/carrierSelection";
import { getSupplier } from "@/lib/supplier-engine/registry";
import { TEST_SUPPLIER_ID } from "@/lib/supplier-engine/fixtures";
import { buildSupplierInternationalProfile } from "@/lib/supplier-engine/internationalOrigin";
import type { Market35PreflightEntry, MarketPreflightStatus } from "./types";

const DEFAULT_SUPPLIER_ORIGIN = "DE";

export function runMarket35Preflight(): {
  valid: boolean;
  pass: number;
  warning: number;
  blocked: number;
  markets: Market35PreflightEntry[];
} {
  const base = validateAll35Markets();
  const supplier = getSupplier(TEST_SUPPLIER_ID);
  const profile = supplier
    ? buildSupplierInternationalProfile(supplier)
    : { supplierCountry: DEFAULT_SUPPLIER_ORIGIN, shippingOrigins: [DEFAULT_SUPPLIER_ORIGIN] } as ReturnType<
        typeof buildSupplierInternationalProfile
      >;

  const origin =
    profile.shippingOrigins[0] ?? profile.warehouseCountries?.[0] ?? profile.supplierCountry ?? DEFAULT_SUPPLIER_ORIGIN;

  const markets: Market35PreflightEntry[] = base.markets.map((m) => {
    const code = m.countryCode;
    const warnings: string[] = [];
    const route = classifyTradeRoute({ originCountry: origin, destinationCountry: code });
    const supplierEligible = supplier?.supportedMarkets?.includes(code) ?? false;
    const customsRequired = route.flags.requiresCustomsPrecheck;
    const carrierAvailable = CARRIER_PROFILES.some((p) =>
      customsRequired ? p.customsSupport && p.internationalSupport : p.internationalSupport,
    );

    if (!supplierEligible) warnings.push("SUPPLIER_NOT_IN_SUPPORTED_MARKETS");
    if (customsRequired) warnings.push("CUSTOMS_PRECHECK_REQUIRED");
    if (!carrierAvailable) warnings.push("NO_CARRIER_PROFILE_FOR_ROUTE");

    let status: MarketPreflightStatus = "PASS";
    if (!m.ok) status = "BLOCKED";
    else if (warnings.length) status = "WARNING";

    return {
      countryCode: code,
      country: m.ok,
      locale: m.locale,
      currency: m.currency,
      vat: m.vat,
      b2c: true,
      b2b: isEuCountry(code),
      shipping: m.shipping,
      supplierEligibility: supplierEligible,
      supplierOrigin: Boolean(origin),
      customs: !customsRequired || Boolean(route.tradeRoute),
      carrier: carrierAvailable,
      payment: m.payment,
      returns: true,
      availability: m.ok,
      tradeRouteSample: route.tradeRoute,
      status,
      warnings,
    };
  });

  return {
    valid: markets.every((m) => m.status !== "BLOCKED"),
    pass: markets.filter((m) => m.status === "PASS").length,
    warning: markets.filter((m) => m.status === "WARNING").length,
    blocked: markets.filter((m) => m.status === "BLOCKED").length,
    markets,
  };
}
