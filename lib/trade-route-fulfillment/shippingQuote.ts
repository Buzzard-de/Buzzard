import { resolveShippingCost } from "@/lib/pricing-engine/shipping";
import type { ShippingQuoteResult } from "./types";

const DEFAULT_WEIGHT_KG = 2.5;

/**
 * Quote shipping using Pricing Engine SSOT — no second shipping engine.
 */
export function quoteShipping(input: {
  originCountry: string;
  destinationCountry: string;
  postalCode: string;
  weight?: number;
  productId: string;
  supplierId: string;
  targetCurrency: string;
  serviceLevel?: string;
}): ShippingQuoteResult {
  if (!input.destinationCountry || input.destinationCountry.length !== 2) {
    return { ok: false, errorCode: "INVALID_DESTINATION", errorMessage: "INVALID_DESTINATION" };
  }

  const resolved = resolveShippingCost({
    productId: input.productId,
    marketId: input.destinationCountry,
    supplierId: input.supplierId,
    targetCurrency: input.targetCurrency,
  });

  return {
    ok: true,
    shippingCost: resolved.shippingCost,
    shippingCurrency: resolved.shippingCurrency,
    region: resolved.region,
    source: resolved.source,
  };
}

export function estimateParcelWeightKg(
  itemCount: number,
  override?: number,
): number {
  if (override != null && override > 0) return override;
  return Math.max(0.5, itemCount * DEFAULT_WEIGHT_KG);
}
