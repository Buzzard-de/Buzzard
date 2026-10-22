import { getMarket } from "./registry";
import type { MarketplaceCapability, MarketplaceIntegrationStatus } from "./types";

export function getMarketplaces(countryCode: string): MarketplaceCapability[] {
  return getMarket(countryCode)?.marketplaces ?? [];
}

export function getMarketplaceById(
  countryCode: string,
  marketplaceId: string
): MarketplaceCapability | undefined {
  return getMarketplaces(countryCode).find((m) => m.id === marketplaceId);
}

export function filterMarketplacesByStatus(
  countryCode: string,
  status: MarketplaceIntegrationStatus
): MarketplaceCapability[] {
  return getMarketplaces(countryCode).filter((m) => m.status === status);
}

export function isMarketplaceSupported(countryCode: string, marketplaceId: string): boolean {
  const mp = getMarketplaceById(countryCode, marketplaceId);
  return Boolean(mp && ["supported", "configured", "connected", "active"].includes(mp.status));
}
