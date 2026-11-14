import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const productCore = require("../lib/pim/productCore.js");
const inventory = require("../lib/commerce/inventoryIntegration.js");
const priceStock = require("../lib/pim/priceStockSafety.js");

describe("catalog stock is not a saleable quantity", () => {
  it("keeps a numeric fixture out of saleable stock", () => {
    const sku = `AUTH-${Date.now()}`;
    const created = productCore.createProduct({
      sku,
      title: "Fixture stock",
      price: 12,
      stock: 4,
      live: true,
      verified: true,
      available: true,
    });
    expect(created.stock).toBe(4);
    expect(created.stockVerified).toBe(false);
    expect(created.purchasable).toBe(false);
    expect(created.saleable).toBeNull();
    expect(created.commercialStock).toBe("UNKNOWN");
    expect(created.stockAuthority).toBe("FIXTURE");
    expect(created.price).toBe(12);

    const view = inventory.getInventory(created.id);
    expect(view.ok).toBe(false);
    expect(view.code).toBe("SALES_CLOSED");
    expect(view.saleable).toBeNull();
    expect(view.available).toBeNull();
    expect(view.purchasable).toBe(false);
    expect(view.fixtureOnly).toBe(true);
    expect(view.fixtureStock).toBe(4);
    expect(view.commercialQty).toBe("UNKNOWN");
    expect(view.reasons).toEqual(expect.arrayContaining([
      "SALES_CLOSED",
      "STOCK_UNVERIFIED",
      "SUPPLIER_COST_UNVERIFIED",
      "STALE_STOCK",
      "INVENTORY_SOURCE_CONFLICT",
      "FALSE_SALEABLE",
    ]));
    expect(productCore.getProduct(created.id).stock).toBe(4);
  });

  it("does not store a mock quantity or invent a missing quantity", () => {
    const mock = productCore.createProduct({
      sku: `MOCK-${Date.now()}`,
      title: "Mock stock",
      price: 8,
      stock: 9,
      mock: true,
    });
    expect(mock.stock).toBeNull();
    expect(mock.stockAuthority).toBe("UNKNOWN");
    const view = inventory.getInventory(mock.id);
    expect(view.fixtureStock).toBeNull();
    expect(view.saleable).toBeNull();
    expect(view.reasons).toEqual(expect.arrayContaining(["UNKNOWN_STOCK", "QTY_UNKNOWN", "MOCK_STOCK"]));

    const missing = priceStock.validatePriceStockRecord({ currency: "EUR", purchasePrice: 3, retailPrice: 5 });
    expect(missing.normalized.stock).toBeNull();
    expect(missing.normalized.stockStatus).toBe("UNKNOWN");
    expect(missing.normalized.stockVerified).toBe(false);
  });
});
