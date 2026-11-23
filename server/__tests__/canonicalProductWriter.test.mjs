import crypto from "node:crypto";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const productService = require("../lib/productService.js");
const productCore = require("../lib/pim/productCore.js");
const pimCatalog = require("../lib/pimCatalog.js");
const productCatalogPim = require("../lib/productCatalogPim.js");
const catalogSeo = require("../lib/catalogSeo.js");
const advancedSearch = require("../lib/advancedSearch.js");
const productStore = require("../lib/productStore.js");
const catalogRead = require("../lib/storefront/catalogReadService.js");
const { db } = require("../lib/db.js");

function sku() {
  return `CANON-${crypto.randomBytes(3).toString("hex")}`;
}

describe("canonical product writer", () => {
  it("rejects a blank sku and does not insert a product", () => {
    const before = db.prepare("SELECT COUNT(*) n FROM pim_core_products").get().n;
    const rejected = productService.recordCanonicalProduct({ sku: "  ", title: "x" });
    expect(rejected.code).toBe("SKU_REQUIRED");
    expect(rejected.status).toBe(400);
    expect(db.prepare("SELECT COUNT(*) n FROM pim_core_products").get().n).toBe(before);
  });

  it("gives storefront, import, and admin the same id", () => {
    const code = sku();
    const actor = { actorId: "catalog-test@example.invalid", actorType: "HUMAN" };
    const created = pimCatalog.createProduct({
      sku: code,
      title: "Canonical brake pad",
      price: 40,
      stock: 3,
    }, actor);
    expect(created.created).toBe(true);
    expect(created.canonicalProductId).toMatch(/^pim_prod_/);

    const admin = productCore.getProduct(created.canonicalProductId);
    expect(admin.sku).toBe(code);
    expect(admin.id).toBe(created.canonicalProductId);

    const storefront = catalogRead.getProductById(created.canonicalProductId, { preview: true });
    expect(storefront.id).toBe(created.canonicalProductId);
    expect(storefront.sku).toBe(code);
    expect(catalogRead.getProductById(created.canonicalProductId)).toBeNull();

    const imported = productStore.upsertProduct({
      id: `json-${code}`,
      sku: code,
      name: "Canonical brake pad renamed",
      price: 41,
      stock: 4,
    }, actor);
    expect(imported.canonicalProductId).toBe(created.canonicalProductId);
    expect(productStore.getProductById(imported.id).canonicalProductId).toBe(created.canonicalProductId);
    expect(productService.getProduct(created.canonicalProductId).title).toBe("Canonical brake pad renamed");

    const again = catalogSeo.createProduct({ sku: code, name: "Canonical brake pad" }, actor);
    expect(again.canonicalProductId).toBe(created.canonicalProductId);
    const copies = db.prepare("SELECT COUNT(*) n FROM pim_core_products WHERE sku = ?").get(code).n;
    expect(copies).toBe(1);
    const third = catalogSeo.createProduct({ sku: code, name: "Canonical brake pad" }, actor);
    expect(third.created).toBe(false);
    expect(third.canonicalProductId).toBe(created.canonicalProductId);

    const search = advancedSearch.createProduct({ sku: `${code}-S`, title: "Search pad", price: 12, stock: 1 }, actor);
    const pim30 = productCatalogPim.createProduct({ sku: `${code}-P`, sellingPrice: 9, stockQty: 2 }, actor);
    expect(search.canonicalProductId).toMatch(/^pim_prod_/);
    expect(pim30.canonicalProductId).toMatch(/^pim_prod_/);
    expect(productService.getProduct(search.canonicalProductId).sku).toBe(`${code}-S`);
    expect(productService.getProduct(pim30.canonicalProductId).sku).toBe(`${code}-P`);

    const duplicateSearch = advancedSearch.createProduct({ sku: `${code}-S`, title: "Search pad" }, actor);
    expect(duplicateSearch.created).toBe(false);
    expect(duplicateSearch.canonicalProductId).toBe(search.canonicalProductId);

    const audit = db
      .prepare("SELECT action FROM pim_core_product_audit WHERE product_id = ? AND action = 'product.create'")
      .get(created.canonicalProductId);
    expect(audit.action).toBe("product.create");
  });
});
