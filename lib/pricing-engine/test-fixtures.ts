import type { PricingInput } from "./types";
import { FIXTURE_PRODUCT_IDS } from "@/lib/product-engine/fixtures";

/** Deterministic test supplier costs and shipping — NOT real commercial values. */
export const PRICING_FIXTURE_COSTS = {
  "reifen-pilot-sport": { supplierCost: 60, shipping: 10, label: "225/45 R17 Reifen" },
  "motoroel-5w30": { supplierCost: 30, shipping: 7, label: "5W-30 Motoröl" },
  "bremsscheibe-280": { supplierCost: 40, shipping: 8, label: "280mm Bremsscheibe" },
  "bremsbelaege-vorder": { supplierCost: 25, shipping: 6, label: "Bremsbeläge" },
} as const;

export const TEST_SUPPLIER_ID = "TEST_SUPPLIER_A";

export function buildFixturePricingInput(
  productId: keyof typeof PRICING_FIXTURE_COSTS,
  options?: Partial<Omit<PricingInput, "productId" | "supplierOffer">> & {
    stock?: number;
    supplierCurrency?: string;
  }
): PricingInput {
  const fixture = PRICING_FIXTURE_COSTS[productId];
  return {
    productId,
    supplierId: options?.supplierId ?? TEST_SUPPLIER_ID,
    marketId: options?.marketId ?? "DE",
    channel: options?.channel ?? "direct",
    currency: options?.currency,
    customerType: options?.customerType,
    paymentMethod: options?.paymentMethod,
    categoryId: options?.categoryId,
    sellerCountry: options?.sellerCountry,
    supplierOffer: {
      supplierPrice: fixture.supplierCost,
      currency: options?.supplierCurrency ?? "EUR",
      stock: options?.stock ?? 10,
      lastUpdated: new Date().toISOString(),
      supplierSku: `${productId}-sku`,
    },
    _testOverrides: {
      shippingCost: fixture.shipping,
      ...options?._testOverrides,
    },
  };
}

export function buildAllFixturePricingInputs(
  marketId = "DE",
  channel: PricingInput["channel"] = "direct"
): PricingInput[] {
  return FIXTURE_PRODUCT_IDS.map((id) =>
    buildFixturePricingInput(id as keyof typeof PRICING_FIXTURE_COSTS, { marketId, channel })
  );
}
