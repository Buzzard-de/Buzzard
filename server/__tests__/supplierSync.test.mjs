import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("supplier adapter", () => {
  it("mock adapter has orders disabled", async () => {
    const { getAdapter } = require("../lib/supplier/adapterRegistry.js");
    const adapter = getAdapter("mock");
    expect(adapter.ordersEnabled).toBe(false);
    const order = await adapter.submitOrder({ actorId: "stock_ai", humanApproved: true });
    expect(order.ok).toBe(false);
    expect(order.purchased).toBe(false);
    expect(order.code).toBe("PURCHASE_BLOCKED");
  });

  it("normalizes products", async () => {
    const { getAdapter } = require("../lib/supplier/adapterRegistry.js");
    const adapter = getAdapter("mock");
    const products = await adapter.fetchProducts();
    expect(products.ok).toBe(false);
    expect(products.mock).toBe(true);
    expect(products.live).toBe(false);
    const normalized = adapter.normalizeProduct(products.records[0]);
    expect(normalized.sku).toBe("MOCK-001");
    expect(normalized.ean).toBeTruthy();
    expect(normalized.price).toBeNull();
    expect(normalized.stock).toBeNull();
  });
});

describe("productSync pipeline", () => {
  it("dry run validates products", async () => {
    const productSync = require("../lib/sync/productSync.js");
    const result = await productSync.runPipeline({ dryRun: true });
    expect(result.validated).toBeGreaterThan(0);
    expect(result.dryRun).toBe(true);
    expect(result.ok).toBe(false);
    expect(result.imported).toBe(0);
    expect(result.products[0].price).toBeNull();
    expect(result.products[0].stock).toBeNull();
  });
});

describe("priceSync pipeline", () => {
  it("detects price changes", async () => {
    const priceSync = require("../lib/sync/priceSync.js");
    const result = await priceSync.runPipeline({ dryRun: true });
    expect(result.ok).toBe(false);
    expect(result.changes).toBe(0);
    expect(result.commercialEligibility).toBe("BLOCKED");
  });
});

describe("stockSync pipeline", () => {
  it("returns stock items", async () => {
    const stockSync = require("../lib/sync/stockSync.js");
    const result = await stockSync.runPipeline({ dryRun: true });
    expect(result.ok).toBe(false);
    expect(result.items).toEqual([]);
    expect(result.updated).toBe(0);
  });
});
