import { getShippingRegion } from "@/lib/market-engine/shipping";
import { getSupplier } from "@/lib/supplier-engine/registry";
import { convertCurrency, roundMoney } from "./currency";
import {
  getDefaultShippingCost,
  getDefaultShippingCurrency,
  getFixtureShippingCost,
  getShippingCostByRegion,
} from "./registry";

export interface ResolvedShippingCost {
  shippingCost: number;
  shippingCurrency: string;
  region: string;
  source: "fixture" | "region" | "default";
}

/**
 * Estimate supplier-direct dropshipping cost for foundation.
 * Uses Market Engine shipping regions + configurable cost tables.
 * Does NOT assume Buzzard warehouse inventory.
 */
export function resolveShippingCost(options: {
  productId: string;
  marketId: string;
  supplierId: string;
  targetCurrency: string;
  override?: number;
}): ResolvedShippingCost {
  const shippingCurrency = getDefaultShippingCurrency();
  const region = getShippingRegion(options.marketId);

  if (options.override != null) {
    const converted =
      convertCurrency(options.override, shippingCurrency, options.targetCurrency) ?? options.override;
    return {
      shippingCost: roundMoney(converted),
      shippingCurrency: options.targetCurrency,
      region,
      source: "fixture",
    };
  }

  const fixtureCost = getFixtureShippingCost(options.productId);
  if (fixtureCost != null) {
    const converted = convertCurrency(fixtureCost, shippingCurrency, options.targetCurrency) ?? fixtureCost;
    return {
      shippingCost: roundMoney(converted),
      shippingCurrency: options.targetCurrency,
      region,
      source: "fixture",
    };
  }

  const supplier = getSupplier(options.supplierId);
  const supplierRegion = supplier?.region;
  let regionCost = getDefaultShippingCost();
  if (supplierRegion) {
    const supplierRegionCost = getShippingCostByRegion(supplierRegion);
    if (supplierRegionCost != null) regionCost = supplierRegionCost;
  } else {
    const marketRegionCost = getShippingCostByRegion(region);
    if (marketRegionCost != null) regionCost = marketRegionCost;
  }

  const converted = convertCurrency(regionCost, shippingCurrency, options.targetCurrency) ?? regionCost;
  return {
    shippingCost: roundMoney(converted),
    shippingCurrency: options.targetCurrency,
    region,
    source: regionCost === getDefaultShippingCost() ? "default" : "region",
  };
}
