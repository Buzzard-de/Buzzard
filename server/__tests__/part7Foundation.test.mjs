import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("storefrontConstants", () => {
  it("bridge enabled by default with db", () => {
    const { isStorefrontBridgeEnabled } = require("../core/storefrontConstants.js");
    expect(typeof isStorefrontBridgeEnabled()).toBe("boolean");
  });
});

describe("storefrontVisibility", () => {
  it("blocks DRAFT products", () => {
    const { isProductVisibleOnStorefront } = require("../lib/storefront/storefrontVisibility.js");
    expect(isProductVisibleOnStorefront({ status: "DRAFT", visibility: "PUBLIC", title: "Test" })).toBe(false);
  });

  it("allows READY PUBLIC products with category", () => {
    const { isProductVisibleOnStorefront } = require("../lib/storefront/storefrontVisibility.js");
    const productCore = require("../lib/pim/productCore.js");
    const demo = productCore.getProduct("pim_prod_demo001");
    expect(isProductVisibleOnStorefront(demo, { skipValidation: true })).toBe(true);
  });
});

describe("publicProductMapper", () => {
  it("maps PIM product without supplier fields", () => {
    const productCore = require("../lib/pim/productCore.js");
    const { mapPimToStorefront } = require("../lib/storefront/publicProductMapper.js");
    const demo = productCore.getProduct("pim_prod_demo001");
    const mapped = mapPimToStorefront(demo);
    expect(mapped.sku).toBe("BZ-CORE-DEMO-001");
    expect(mapped.buyNowEnabled).toBe(false);
    expect(mapped.supplier).toBeUndefined();
    expect(mapped.seo.slug).toBeTruthy();
  });
});

describe("catalogReadService", () => {
  it("lists public products with pagination", () => {
    const catalogReadService = require("../lib/storefront/catalogReadService.js");
    const result = catalogReadService.listProducts({ page: 1, limit: 10 });
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.page).toBe(1);
    expect(result.catalogMode).toBe(true);
  });

  it("gets product by slug", () => {
    const catalogReadService = require("../lib/storefront/catalogReadService.js");
    const product = catalogReadService.getProductById("universal-demo-product");
    expect(product?.sku).toBe("BZ-CORE-DEMO-001");
  });
});

describe("filterSort", () => {
  it("sorts by price asc", () => {
    const { sortProducts } = require("../lib/storefront/filterSort.js");
    const items = [{ title: "b", price: 20 }, { title: "a", price: 10 }];
    const sorted = sortProducts(items, "price-asc");
    expect(sorted[0].price).toBe(10);
  });
});

describe("catalogCache", () => {
  it("stores and retrieves entries", () => {
    const catalogCache = require("../lib/storefront/catalogCache.js");
    catalogCache.set("test|key", { ok: true }, 5000);
    expect(catalogCache.get("test|key")?.ok).toBe(true);
    catalogCache.invalidate("test|");
  });
});

describe("syncStatus", () => {
  it("runs dry sync", () => {
    const syncStatus = require("../lib/storefront/syncStatus.js");
    const result = syncStatus.runSync({ dryRun: true });
    expect(result.dryRun).toBe(true);
    expect(result.summary).toBeDefined();
  });
});

describe("categoryCatalog", () => {
  it("lists visible main categories", () => {
    const categoryCatalog = require("../lib/storefront/categoryCatalog.js");
    const cats = categoryCatalog.listMainCategories();
    expect(cats.length).toBeGreaterThan(0);
    expect(cats.every((c) => c.customerVisible)).toBe(true);
  });
});

describe("jobHandlers CATALOG_SYNC", () => {
  it("has CATALOG_SYNC handler", () => {
    const { HANDLERS } = require("../lib/jobHandlers.js");
    const { JOB_TYPES } = require("../core/jobConstants.js");
    expect(HANDLERS[JOB_TYPES.CATALOG_SYNC]).toBeTypeOf("function");
  });
});
