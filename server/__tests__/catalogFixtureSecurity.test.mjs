/**
 * Phase 12 — Synthetic shelf item (BZ-E2E-VISIBLE-001) and public catalog safety.
 * Uses only an isolated API; never the developer ports or server/data.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startIsolatedApi } from "./support/isolatedApi.mjs";

let withFlag;
let withoutFlag;

beforeAll(async () => {
  withFlag = await startIsolatedApi({ env: { BUZZARD_E2E_DB: "1", BUZZARD_TEST_MODE: "1" } });
  withoutFlag = await startIsolatedApi({ env: { BUZZARD_E2E_DB: undefined, BUZZARD_TEST_MODE: "1" } });
}, 120_000);

afterAll(async () => {
  await withFlag?.stop();
  await withoutFlag?.stop();
});

function publicKeys(product) {
  return {
    sku: product.sku,
    ean: product.ean,
    gtin: product.gtin,
    brand: product.brand,
    categoryId: product.categoryId,
    categorySlug: product.categorySlug,
    title: product.title,
  };
}

describe("BZ-E2E-VISIBLE-001 fixture", () => {
  it("is inserted only when BUZZARD_E2E_DB=1", async () => {
    const on = await withFlag.request("GET", "/api/catalog/products");
    expect(on.status).toBe(200);
    expect(on.json.items.map((i) => i.sku)).toContain("BZ-E2E-VISIBLE-001");

    const off = await withoutFlag.request("GET", "/api/catalog/products");
    expect(off.status).toBe(200);
    expect(off.json.items.map((i) => i.sku)).not.toContain("BZ-E2E-VISIBLE-001");
    expect(JSON.stringify(off.json)).not.toMatch(/BZ-E2E-VISIBLE-001|Synthetic shelf item|pim_prod_e2e_visible/);
  });

  it("does not invent EAN, GTIN, brand or category for the fixture", async () => {
    const list = await withFlag.request("GET", "/api/catalog/products");
    const item = list.json.items.find((i) => i.sku === "BZ-E2E-VISIBLE-001");
    expect(item).toBeTruthy();
    expect(publicKeys(item)).toMatchObject({
      sku: "BZ-E2E-VISIBLE-001",
      ean: null,
      gtin: null,
      brand: null,
      categoryId: null,
      categorySlug: null,
      title: "Synthetic shelf item",
    });
    // Structured data must not invent a brand or gtin either.
    expect(item.structuredData?.brand).toBeUndefined();
    expect(item.structuredData?.gtin).toBeUndefined();
    expect(item.structuredData?.gtin13).toBeUndefined();
  });

  it("is reachable by its public slug and by its id", async () => {
    const byId = await withFlag.request("GET", "/api/catalog/products/pim_prod_e2e_visible");
    expect(byId.status).toBe(200);
    expect(byId.json.product.sku).toBe("BZ-E2E-VISIBLE-001");
    expect(byId.json.product.seo.slug).toBe("synthetic-shelf-item");

    const bySlug = await withFlag.request("GET", "/api/catalog/products/slug/synthetic-shelf-item");
    expect(bySlug.status).toBe(200);
    expect(bySlug.json.product.sku).toBe("BZ-E2E-VISIBLE-001");

    const bySlugAsId = await withFlag.request("GET", "/api/catalog/products/synthetic-shelf-item");
    expect(bySlugAsId.status).toBe(200);
    expect(bySlugAsId.json.product.sku).toBe("BZ-E2E-VISIBLE-001");
  });

  it("keeps the HIDDEN demo product out of the public catalog", async () => {
    const list = await withFlag.request("GET", "/api/catalog/products");
    expect(list.json.items.map((i) => i.sku)).not.toContain("BZ-CORE-DEMO-001");
    const demo = await withFlag.request("GET", "/api/catalog/products/pim_prod_demo001");
    expect(demo.status).toBe(404);
  });
});

describe("anonymous preview must not open unpublished products", () => {
  it("ignores ?preview=1 on public catalog and search routes", async () => {
    for (const path of [
      "/api/catalog/products?preview=1",
      "/api/catalog/products/pim_prod_demo001?preview=1",
      "/api/catalog/products/slug/universal-demo-product?preview=1",
      "/api/catalog/search?q=demo&preview=1",
    ]) {
      const res = await withFlag.request("GET", path);
      if (path.startsWith("/api/catalog/products?") || path.startsWith("/api/catalog/search")) {
        expect(res.status, path).toBe(200);
        const skus = (res.json.items || []).map((i) => i.sku);
        expect(skus, path).not.toContain("BZ-CORE-DEMO-001");
      } else {
        expect(res.status, path).toBe(404);
      }
    }
  });

  it("still lets an administrator open the admin preview list", async () => {
    const token = await withFlag.login("administrator");
    const res = await withFlag.request("GET", "/api/admin/storefront/preview/products", { token });
    expect(res.status).toBe(200);
    expect(res.json.preview).toBe(true);
    expect(res.json.items.map((i) => i.sku)).toContain("BZ-CORE-DEMO-001");
  });

  it("refuses the admin preview without a session", async () => {
    const res = await withFlag.request("GET", "/api/admin/storefront/preview/products");
    expect(res.status).toBe(401);
  });
});
