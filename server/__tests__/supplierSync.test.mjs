import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("supplier adapter", () => {
  it("mock adapter has orders disabled", async () => {
    const { getAdapter } = require("../lib/supplier/adapterRegistry.js");
    const adapter = getAdapter("mock");
    expect(adapter.ordersEnabled).toBe(false);
    await expect(adapter.submitOrder()).rejects.toThrow(/disabled/i);
  });

  it("normalizes products", async () => {
    const { getAdapter } = require("../lib/supplier/adapterRegistry.js");
    const adapter = getAdapter("mock");
    const products = await adapter.fetchProducts();
    const normalized = adapter.normalizeProduct(products[0]);
    expect(normalized.sku).toBe("MOCK-001");
    expect(normalized.ean).toBeTruthy();
  });
});

describe("productSync pipeline", () => {
  it("dry run validates products", async () => {
    const productSync = require("../lib/sync/productSync.js");
    const result = await productSync.runPipeline({ dryRun: true });
    expect(result.validated).toBeGreaterThan(0);
    expect(result.dryRun).toBe(true);
  });
});

describe("priceSync pipeline", () => {
  it("detects price changes", async () => {
    const priceSync = require("../lib/sync/priceSync.js");
    const result = await priceSync.runPipeline({ dryRun: true });
    expect(result.changes).toBeGreaterThan(0);
  });
});

describe("stockSync pipeline", () => {
  it("returns stock items", async () => {
    const stockSync = require("../lib/sync/stockSync.js");
    const result = await stockSync.runPipeline({ dryRun: true });
    expect(result.items.length).toBeGreaterThan(0);
  });
});
