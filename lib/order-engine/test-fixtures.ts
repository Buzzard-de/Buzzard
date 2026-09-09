import { processSupplierStockUpdate } from "@/lib/inventory-engine";
import { buildStockUpdateFixture, FIXTURE_SKU_MAP, TEST_SUPPLIER_ID } from "@/lib/inventory-engine/test-fixtures";
import { loadFixtureProducts } from "@/lib/product-engine/fixtures";
import { upsertRegistryProduct, createSupplierOffer } from "@/lib/product-engine";
import { PRICING_FIXTURE_COSTS } from "@/lib/pricing-engine/test-fixtures";
import type { AddressSnapshot, CreateOrderInput } from "./types";
import type { ProductEngineProduct } from "@/lib/product-engine/types";

export const TEST_CUSTOMER_A = "cust_test_a";
export const TEST_CUSTOMER_B = "cust_test_b";

export const DEFAULT_SHIPPING_ADDRESS: AddressSnapshot = {
  recipientName: "Max Mustermann",
  street: "Musterstraße",
  houseNumber: "12",
  postalCode: "10115",
  city: "Berlin",
  country: "DE",
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

export function seedOrderEngineFixtures(): void {
  for (const product of loadFixtureProducts()) {
    upsertRegistryProduct(alignProductWithTestSupplier(product));
  }
  processSupplierStockUpdate(buildStockUpdateFixture("reifen-pilot-sport", 100));
  processSupplierStockUpdate(buildStockUpdateFixture("motoroel-5w30", 50));
  processSupplierStockUpdate(buildStockUpdateFixture("bremsscheibe-280", 24));
  processSupplierStockUpdate(buildStockUpdateFixture("bremsbelaege-vorder", 31));
}

export function buildSingleItemOrderInput(
  productId: string,
  options?: Partial<CreateOrderInput>
): CreateOrderInput {
  return {
    customerId: TEST_CUSTOMER_A,
    customerEmail: "test@example.com",
    marketId: "DE",
    channel: "direct",
    items: [{ productId, quantity: 1 }],
    shippingAddress: DEFAULT_SHIPPING_ADDRESS,
    idempotencyKey: `idem_${productId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ...options,
  };
}

export function buildMultiItemOrderInput(): CreateOrderInput {
  return {
    customerId: TEST_CUSTOMER_A,
    customerEmail: "test@example.com",
    marketId: "DE",
    channel: "direct",
    items: [
      { productId: "reifen-pilot-sport", quantity: 1 },
      { productId: "motoroel-5w30", quantity: 2 },
    ],
    shippingAddress: DEFAULT_SHIPPING_ADDRESS,
    idempotencyKey: `idem_multi_${Date.now()}`,
  };
}
