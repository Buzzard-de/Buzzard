import { FIXTURE_PRODUCT_IDS } from "@/lib/product-engine/fixtures";
import { TEST_SUPPLIER_ID } from "@/lib/supplier-engine/fixtures";

export { TEST_SUPPLIER_ID };

export const FIXTURE_SKU_MAP = {
  "reifen-pilot-sport": "TSA-TIRE-225-45-17",
  "motoroel-5w30": "TSA-OIL-5W30-5L",
  "bremsscheibe-280": "TSA-DISC-280",
  "bremsbelaege-vorder": "TSA-PADS-FRONT",
} as const;

export const STOCK_TEST_SCENARIOS = {
  IN_STOCK_100: 100,
  IN_STOCK_25: 25,
  LOW_STOCK_5: 5,
  LAST_UNIT_1: 1,
  OUT_OF_STOCK_0: 0,
  NEGATIVE: -5,
  MISSING: null,
  INVALID_TEXT: "abc",
} as const;

export function buildStockUpdateFixture(
  productId: (typeof FIXTURE_PRODUCT_IDS)[number],
  quantity: unknown,
  options?: { discontinued?: boolean }
) {
  const sku = FIXTURE_SKU_MAP[productId];
  return {
    productId,
    supplierId: TEST_SUPPLIER_ID,
    supplierOfferId: sku,
    supplierSku: sku,
    rawQuantity: quantity,
    source: TEST_SUPPLIER_ID,
    discontinued: options?.discontinued,
    syncType: "SINGLE_PRODUCT_STOCK_SYNC" as const,
  };
}

export function getAllFixtureProductIds(): string[] {
  return [...FIXTURE_PRODUCT_IDS];
}
