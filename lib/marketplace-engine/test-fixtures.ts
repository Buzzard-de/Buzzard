import { processSupplierStockUpdate, clearStockRegistry, clearAllReservations } from "@/lib/inventory-engine";
import { buildStockUpdateFixture, TEST_SUPPLIER_ID } from "@/lib/inventory-engine/test-fixtures";
import { loadFixtureProducts } from "@/lib/product-engine/fixtures";
import { upsertRegistryProduct, createSupplierOffer } from "@/lib/product-engine";
import { PRICING_FIXTURE_COSTS } from "@/lib/pricing-engine/test-fixtures";
import { FIXTURE_SKU_MAP } from "@/lib/inventory-engine/test-fixtures";
import { clearOrderRegistry, clearOrderEvents, clearOrderAuditLog } from "@/lib/order-engine";
import { seedOrderEngineFixtures } from "@/lib/order-engine/test-fixtures";
import { createCategoryMapping } from "./mapping";
import { clearConnectorCache } from "./connector";
import {
  clearMarketplaceRegistry,
  setStockPolicy,
} from "./registry";
import { clearMarketplaceEvents } from "./events";
import { clearMarketplaceAuditLog } from "./audit";
import { resetRateLimit } from "@/lib/supplier-engine/rateLimit";
import type { ProductEngineProduct } from "@/lib/product-engine/types";

export const TEST_AMAZON = "TEST_AMAZON";
export const TEST_EBAY = "TEST_EBAY";
export const TEST_KAUFLAND = "TEST_KAUFLAND";

export const MARKETPLACE_TEST_MARKETS = {
  DE: "DE",
  FR: "FR",
  PL: "PL",
  CZ: "CZ",
  TR: "TR",
  SA: "SA",
  AE: "AE",
  EG: "EG",
} as const;

const CATEGORY_MAP: Record<string, string> = {
  "cat-05-05": "MP-TIRES",
  "cat-05-01": "MP-OIL",
  "cat-05-03": "MP-BRAKES",
};

function alignProductWithTestSupplier(product: ProductEngineProduct): ProductEngineProduct {
  const fixture = PRICING_FIXTURE_COSTS[product.productId as keyof typeof PRICING_FIXTURE_COSTS];
  const supplierSku = FIXTURE_SKU_MAP[product.productId as keyof typeof FIXTURE_SKU_MAP];
  if (!fixture || !supplierSku) return product;

  const offer = createSupplierOffer({
    supplierId: TEST_SUPPLIER_ID,
    supplierSku,
    supplierEan: product.ean,
    supplierPrice: fixture.supplierCost,
    currency: "EUR",
    stock: 100,
    source: TEST_SUPPLIER_ID,
    sourceType: "MANUAL",
    reliabilityScore: 0.85,
  });

  return {
    ...product,
    supplierOffers: [offer],
    stock: { quantity: 100, availability: "IN_STOCK", lastUpdated: new Date().toISOString() },
  };
}

export function seedMarketplaceEngineFixtures(): void {
  clearMarketplaceRegistry();
  clearMarketplaceEvents();
  clearMarketplaceAuditLog();
  clearConnectorCache();
  clearOrderRegistry();
  clearStockRegistry();
  clearAllReservations();
  clearOrderEvents();
  clearOrderAuditLog();
  resetRateLimit();

  for (const product of loadFixtureProducts()) {
    upsertRegistryProduct(alignProductWithTestSupplier(product));
  }

  processSupplierStockUpdate(buildStockUpdateFixture("reifen-pilot-sport", 100));
  processSupplierStockUpdate(buildStockUpdateFixture("motoroel-5w30", 50));
  processSupplierStockUpdate(buildStockUpdateFixture("bremsscheibe-280", 24));
  processSupplierStockUpdate(buildStockUpdateFixture("bremsbelaege-vorder", 31));

  seedOrderEngineFixtures();

  for (const marketplaceId of [TEST_AMAZON, TEST_EBAY, TEST_KAUFLAND, "amazon", "kaufland", "allegro"]) {
    for (const [buzzardCat, mpCat] of Object.entries(CATEGORY_MAP)) {
      createCategoryMapping({
        marketplaceId,
        marketId: "DE",
        buzzardCategoryId: buzzardCat,
        marketplaceCategoryId: mpCat,
      });
    }
  }

  setStockPolicy(TEST_AMAZON, { maxPublishedQuantity: 20 });
  setStockPolicy(TEST_EBAY, { stockBuffer: 5 });
}

export function buildListingInput(productId: string, marketplaceId: string = TEST_AMAZON, marketId = "DE") {
  return { productId, marketplaceId, marketId, language: "de" };
}

export function buildImportOrderInput(options?: {
  marketplaceId?: string;
  marketplaceOrderId?: string;
  productId?: string;
}) {
  return {
    marketplaceId: options?.marketplaceId ?? TEST_AMAZON,
    marketplaceOrderId: options?.marketplaceOrderId ?? `MP-ORD-${Date.now()}`,
    marketId: "DE",
    channel: "amazon" as const,
    customerId: "cust_marketplace_a",
    customerEmail: "marketplace-buyer@example.com",
    items: [{ productId: options?.productId ?? "reifen-pilot-sport", quantity: 1, unitGrossPrice: 0 }],
    marketplaceStatus: "PAID",
    idempotencyKey: `mp_idem_${options?.marketplaceOrderId ?? Date.now()}`,
    shippingAddress: {
      recipientName: "Market Buyer",
      street: "Marktplatz",
      postalCode: "10115",
      city: "Berlin",
      country: "DE",
    },
  };
}
