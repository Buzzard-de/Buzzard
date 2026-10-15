import { afterEach, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);

describe("product write boundary — policy only, SoT inactive", () => {
  const boundary = require("../lib/pim/productWriteBoundary");
  const productCatalogPim = require("../lib/productCatalogPim");
  const productCore = require("../lib/pim/productCore");
  const pimCatalog = require("../lib/pimCatalog");
  const catalogSeo = require("../lib/catalogSeo");
  const { db } = require("../lib/db");
  const productStore = require("../lib/productStore");

  function countSku(table, sku) {
    return db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE sku = ?`).get(sku).n;
  }

  it("does not activate Product Source of Truth", () => {
    expect(boundary.isProductSourceOfTruthActive()).toBe(false);
    const denied = boundary.authorizeCreate(
      { sku: "SOT-ACTIVATE", activateSourceOfTruth: true },
      { authorized: true, requireExplicitAuth: true, destination: "pim30_products" }
    );
    expect(denied.ok).toBe(false);
    expect(denied.reason).toBe("SOT_ACTIVATION_BLOCKED");
    expect(denied.productSourceOfTruthActive).toBe(false);
  });

  it("rejects unauthorized catalog-pim writes without persistence", () => {
    const result = productCatalogPim.createProduct({
      sku: `PIM30-UNAUTH-${Date.now()}`,
      status: "draft",
    });
    expect(result.error).toBeTruthy();
    expect(result.status).toBe(403);
    expect(result.reason).toBe("UNAUTHORIZED");
  });

  it("rejects ACTIVE catalog-pim create even when authorized", () => {
    const result = productCatalogPim.createProduct(
      { sku: `PIM30-ACT-${Date.now()}`, status: "ACTIVE" },
      { authorized: true, source: "ADMIN", actorId: "vitest" }
    );
    expect(result.error).toMatch(/ACTIVE/);
    expect(result.reason).toBe("ACTIVE_CREATE_REJECTED");
  });

  it("rejects conflicting supplier offers and does not buy stock", () => {
    const result = productCatalogPim.createProduct(
      {
        sku: `PIM30-CONF-${Date.now()}`,
        status: "draft",
        offers: [
          { quantity: 8, source: "supplier_a" },
          { quantity: 2, source: "supplier_b" },
        ],
      },
      { authorized: true, source: "ADMIN", actorId: "vitest" }
    );
    expect(result.ok).not.toBe(true);
    expect(result.reason).toBe("CONFLICTING_SUPPLIER_OFFERS");
    expect(result.status).toBe(409);
  });

  it("allows an authorized draft through the boundary into the existing pim30 store only", () => {
    const sku = `PIM30-OK-${Date.now()}`;
    const result = productCatalogPim.createProduct(
      { sku, status: "draft" },
      { authorized: true, source: "ADMIN", actorId: "vitest" }
    );
    expect(result.error).toBeUndefined();
    expect(result.created).toBe(true);
    expect(result.dualWrite).toBe(false);
    expect(result.productSourceOfTruthActive).toBe(false);
    expect(result.boundary).toBe(boundary.BOUNDARY_ID);
    expect(result.product.sku).toBe(sku);
    expect(result.product.status).toBe("draft");
    expect(productCore.getProduct(sku)).toBeNull();
  });

  it("keeps productCore ACTIVE create blocked on the shared boundary", () => {
    expect(() =>
      productCore.createProduct(
        { sku: `CORE-ACT-${Date.now()}`, title: "Nope", status: "ACTIVE" },
        { dryRun: true, source: "TEST", actorId: "vitest" }
      )
    ).toThrow(/ACTIVE/);
  });

  it("rejects unauthorized pimCatalog writes and preserves sku required", () => {
    const unauthorized = pimCatalog.createProduct({ sku: `PIM19-UNAUTH-${Date.now()}`, status: "draft" });
    expect(unauthorized.status).toBe(403);
    expect(unauthorized.reason).toBe("UNAUTHORIZED");
    expect(pimCatalog.createProduct({}).error).toBe("sku required");
    expect(
      pimCatalog.createProduct(
        { sku: `PIM19-ACT-${Date.now()}`, status: "active" },
        { authorized: true, source: "ADMIN", actorId: "vitest" }
      ).reason
    ).toBe("ACTIVE_CREATE_REJECTED");
    const systemSku = `PIM19-SYS-${Date.now()}`;
    const inherited = pimCatalog.createProduct(
      { sku: systemSku, status: "draft" },
      { source: "SYSTEM", actorId: "importer" }
    );
    expect(inherited.reason).toBe("UNAUTHORIZED");
    expect(countSku("pim_products", systemSku)).toBe(0);
  });

  it("rejects conflicting supplier offers on pimCatalog without buying stock", () => {
    const sku = `PIM19-CONF-${Date.now()}`;
    const result = pimCatalog.createProduct(
      {
        sku,
        status: "draft",
        offers: [
          { quantity: 8, source: "supplier_a" },
          { quantity: 2, source: "supplier_b" },
        ],
      },
      { authorized: true, source: "ADMIN", actorId: "vitest" }
    );
    expect(result.reason).toBe("CONFLICTING_SUPPLIER_OFFERS");
    expect(result.status).toBe(409);
    expect(countSku("pim_products", sku)).toBe(0);
  });

  it("does not trust body identity and cannot activate SoT via pimCatalog", () => {
    const sku = `PIM19-FORGE-${Date.now()}`;
    const forged = pimCatalog.createProduct({
      sku,
      status: "draft",
      authorized: true,
      actorId: "forged-admin",
      activateSourceOfTruth: true,
    });
    expect(forged.reason).toBe("SOT_ACTIVATION_BLOCKED");
    expect(countSku("pim_products", sku)).toBe(0);
  });

  it("allows an authorized pimCatalog draft only in pim_products", () => {
    const sku = `PIM19-OK-${Date.now()}`;
    const created = pimCatalog.createProduct(
      { sku, status: "draft" },
      { authorized: true, source: "ADMIN", actorId: "vitest" }
    );
    expect(created.error).toBeUndefined();
    expect(created.product.sku).toBe(sku);
    expect(created.product.status).toBe("draft");
    expect(created.product.completeness).toEqual(expect.any(Number));
    expect(created.dualWrite).toBe(false);
    expect(created.productSourceOfTruthActive).toBe(false);
    expect(created.boundary).toBe(boundary.BOUNDARY_ID);
    expect(countSku("pim_products", sku)).toBe(1);
    expect(countSku("pim_core_products", sku)).toBe(0);
    expect(countSku("pim30_products", sku)).toBe(0);
    expect(countSku("products", sku)).toBe(0);
    expect(productStore.listProducts().some((row) => row.sku === sku)).toBe(false);

    const duplicate = pimCatalog.createProduct(
      { sku, status: "draft" },
      { authorized: true, source: "ADMIN", actorId: "vitest" }
    );
    expect(duplicate.error).toBe("product.skuExists");
    expect(duplicate.status).toBe(409);
    expect(countSku("pim_products", sku)).toBe(1);
  });

  it("rejects unauthorized catalogSeo writes and preserves sku and name required", () => {
    const unauthorized = catalogSeo.createProduct({ sku: `SEO-UNAUTH-${Date.now()}`, name: "Nope" });
    expect(unauthorized.status).toBe(403);
    expect(unauthorized.reason).toBe("UNAUTHORIZED");
    expect(catalogSeo.createProduct({}).error).toBe("sku and name required");
    expect(catalogSeo.createProduct({ sku: `SEO-NONAME-${Date.now()}` }, { authorized: true, source: "ADMIN", actorId: "vitest" }).error).toBe(
      "sku and name required"
    );
    expect(
      catalogSeo.createProduct(
        { sku: `SEO-ACT-${Date.now()}`, name: "Live", status: "ACTIVE" },
        { authorized: true, source: "ADMIN", actorId: "vitest" }
      ).reason
    ).toBe("ACTIVE_CREATE_REJECTED");
    expect(
      catalogSeo.createProduct(
        { sku: `SEO-FLAG-${Date.now()}`, name: "Live", active: true },
        { authorized: true, source: "ADMIN", actorId: "vitest" }
      ).reason
    ).toBe("ACTIVE_CREATE_REJECTED");
  });

  it("does not trust body identity and cannot activate SoT via catalogSeo", () => {
    const sku = `SEO-FORGE-${Date.now()}`;
    const forged = catalogSeo.createProduct({
      sku,
      name: "Forged",
      authorized: true,
      actorId: "forged-admin",
      activateSourceOfTruth: true,
    });
    expect(forged.reason).toBe("SOT_ACTIVATION_BLOCKED");
    expect(countSku("products", sku)).toBe(0);
  });

  it("rejects conflicting supplier offers on catalogSeo without buying stock", () => {
    const sku = `SEO-CONF-${Date.now()}`;
    const result = catalogSeo.createProduct(
      {
        sku,
        name: "Conflict",
        offers: [
          { quantity: 8, source: "supplier_a" },
          { quantity: 2, source: "supplier_b" },
        ],
      },
      { authorized: true, source: "ADMIN", actorId: "vitest" }
    );
    expect(result.reason).toBe("CONFLICTING_SUPPLIER_OFFERS");
    expect(result.status).toBe(409);
    expect(countSku("products", sku)).toBe(0);
  });

  it("allows an authorized catalogSeo draft only in products and blocks inactive-to-active while sales are locked", () => {
    const sku = `SEO-OK-${Date.now()}`;
    const created = catalogSeo.createProduct(
      { sku, name: "Catalog draft" },
      { authorized: true, source: "ADMIN", actorId: "vitest" }
    );
    expect(created.error).toBeUndefined();
    expect(created.product.sku).toBe(sku);
    expect(created.product.name).toBe("Catalog draft");
    expect(created.product.active).toBe(false);
    expect(created.dualWrite).toBe(false);
    expect(created.productSourceOfTruthActive).toBe(false);
    expect(created.boundary).toBe(boundary.BOUNDARY_ID);
    expect(countSku("products", sku)).toBe(1);
    expect(countSku("pim_core_products", sku)).toBe(0);
    expect(countSku("pim30_products", sku)).toBe(0);
    expect(countSku("pim_products", sku)).toBe(0);
    expect(productStore.listProducts().some((row) => row.sku === sku)).toBe(false);

    const duplicate = catalogSeo.createProduct(
      { sku, name: "Catalog draft" },
      { authorized: true, source: "ADMIN", actorId: "vitest" }
    );
    expect(duplicate.error).toBe("SKU or slug already exists");
    expect(duplicate.status).toBe(409);
    expect(countSku("products", sku)).toBe(1);

    const activated = catalogSeo.updateProduct(created.product.id, { active: true });
    expect(activated.reason).toBe("ACTIVE_UPDATE_REJECTED");
    expect(countSku("products", sku)).toBe(1);
    expect(db.prepare("SELECT active FROM products WHERE sku = ?").get(sku).active).toBe(0);
  });

  describe("productStore JSON catalog", () => {
    const previousPath = process.env.BUZZARD_PRODUCT_STORE_PATH;
    const tempFiles = [];

    function withTempCatalog() {
      const file = path.join(os.tmpdir(), `buzzard-products-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
      fs.writeFileSync(file, JSON.stringify({ products: [], updated_at: new Date().toISOString() }));
      process.env.BUZZARD_PRODUCT_STORE_PATH = file;
      tempFiles.push(file);
      return file;
    }

    afterEach(() => {
      if (previousPath === undefined) delete process.env.BUZZARD_PRODUCT_STORE_PATH;
      else process.env.BUZZARD_PRODUCT_STORE_PATH = previousPath;
      for (const file of tempFiles.splice(0)) {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      }
    });

    it("rejects unauthorized and ACTIVE productStore creates without touching other stores", () => {
      withTempCatalog();
      const sku = `JSON-UNAUTH-${Date.now()}`;
      const denied = productStore.upsertProduct({ id: "prod-unauth", sku, name: "Nope", status: "draft" });
      expect(denied.reason).toBe("UNAUTHORIZED");
      expect(productStore.listProducts().some((row) => row.sku === sku)).toBe(false);
      expect(
        productStore.upsertProduct(
          { id: "prod-act", sku: `JSON-ACT-${Date.now()}`, name: "Live", status: "active" },
          { authorized: true, source: "ADMIN", actorId: "vitest" }
        ).reason
      ).toBe("ACTIVE_CREATE_REJECTED");
    });

    it("allows an authorized JSON draft only in the file catalog and blocks activation", () => {
      const file = withTempCatalog();
      const sku = `JSON-OK-${Date.now()}`;
      const created = productStore.upsertProduct(
        { id: "prod-json-ok", sku, name: "File draft", status: "draft" },
        { authorized: true, source: "ADMIN", actorId: "vitest" }
      );
      expect(created.error).toBeUndefined();
      expect(created.sku).toBe(sku);
      expect(created.status).toBe("draft");
      expect(countSku("products", sku)).toBe(0);
      expect(countSku("pim_core_products", sku)).toBe(0);
      expect(countSku("pim30_products", sku)).toBe(0);
      expect(countSku("pim_products", sku)).toBe(0);
      const saved = JSON.parse(fs.readFileSync(file, "utf8"));
      expect(saved.products.filter((row) => row.sku === sku)).toHaveLength(1);

      const duplicate = productStore.upsertProduct(
        { id: "prod-json-dup", sku, name: "File draft", status: "draft" },
        { authorized: true, source: "ADMIN", actorId: "vitest" }
      );
      expect(duplicate.error).toBe("product.skuExists");
      expect(duplicate.status).toBe(409);

      const activated = productStore.upsertProduct(
        { ...created, status: "active" },
        { authorized: true, source: "ADMIN", actorId: "vitest" }
      );
      expect(activated.reason).toBe("ACTIVE_UPDATE_REJECTED");
      expect(productStore.getProductById("prod-json-ok").status).toBe("draft");

      const otherSku = `JSON-OTHER-${Date.now()}`;
      const other = productStore.upsertProduct(
        { id: "prod-json-other", sku: otherSku, name: "Other draft", status: "draft" },
        { authorized: true, source: "ADMIN", actorId: "vitest" }
      );
      expect(other.error).toBeUndefined();
      const collide = productStore.upsertProduct(
        { ...other, sku },
        { authorized: true, source: "ADMIN", actorId: "vitest" }
      );
      expect(collide.error).toBe("product.skuExists");
      expect(collide.status).toBe(409);
      expect(productStore.getProductById("prod-json-other").sku).toBe(otherSku);

      expect(productStore.deleteProduct("prod-json-ok").reason).toBe("UNAUTHORIZED");
      expect(productStore.getProductById("prod-json-ok")).toBeTruthy();
      const removed = productStore.deleteProduct("prod-json-ok", {
        authorized: true,
        source: "ADMIN",
        actorId: "vitest",
      });
      expect(removed.deleted).toBe(true);
      expect(removed.dualWrite).toBe(false);
      expect(productStore.getProductById("prod-json-ok")).toBeUndefined();
    });
  });

  it("rejects unauthorized pimCatalog updates and ACTIVE status transitions", () => {
    const sku = `PIM19-UPD-${Date.now()}`;
    const created = pimCatalog.createProduct(
      { sku, status: "draft" },
      { authorized: true, source: "ADMIN", actorId: "vitest" }
    );
    expect(created.product.id).toBeTruthy();
    expect(pimCatalog.updateProduct(created.product.id, { status: "published" }).reason).toBe("UNAUTHORIZED");
    const activated = pimCatalog.updateProduct(
      created.product.id,
      { status: "ACTIVE" },
      { authorized: true, source: "ADMIN", actorId: "vitest" }
    );
    expect(activated.reason).toBe("ACTIVE_UPDATE_REJECTED");
    expect(db.prepare("SELECT status FROM pim_products WHERE sku = ?").get(sku).status).toBe("draft");
  });
});
