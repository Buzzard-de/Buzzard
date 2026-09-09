import { getMarket, getMarketShippingRegion } from "./registry";

export type ShippingCapability =
  | "standard"
  | "express"
  | "free"
  | "pickup"
  | "supplier_direct"
  | "dropshipping";

export function getMarketShippingCapabilities(countryCode: string): ShippingCapability[] {
  const market = getMarket(countryCode);
  return (market?.shippingCapabilities ?? ["standard", "supplier_direct", "dropshipping"]) as ShippingCapability[];
}

export function getShippingRegion(countryCode: string): string {
  return getMarketShippingRegion(countryCode);
}

/** Technical routing group label — not a final shipping price. */
export function describeShippingRegion(countryCode: string): {
  region: string;
  capabilities: ShippingCapability[];
} {
  return {
    region: getShippingRegion(countryCode),
    capabilities: getMarketShippingCapabilities(countryCode),
  };
}
