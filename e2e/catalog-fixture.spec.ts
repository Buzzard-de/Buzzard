import { test, expect } from "@playwright/test";

const API = (process.env.BUZZARD_API_URL || "http://localhost:3001").replace(/\/$/, "");

/**
 * Phase 12 — What the isolated stack's public catalog says about the synthetic
 * shelf item. Never invents EAN/GTIN/brand/category. Runs in the api project.
 */
test.describe("Catalog fixture BZ-E2E-VISIBLE-001", () => {
  test.skip(!process.env.BUZZARD_E2E_RUN_ROOT, "isolated stack required (scripts/isolated/e2e.sh)");

  test("lists the fixture without invented identity fields", async ({ request }) => {
    const list = await request.get(`${API}/api/catalog/products`);
    expect(list.ok()).toBeTruthy();
    const body = await list.json();
    const item = (body.items || []).find((row: { sku?: string }) => row.sku === "BZ-E2E-VISIBLE-001");
    expect(item, "fixture present when BUZZARD_E2E_DB=1").toBeTruthy();
    expect(item.ean).toBeNull();
    expect(item.gtin).toBeNull();
    expect(item.brand).toBeNull();
    expect(item.categoryId).toBeNull();
    expect(item.categorySlug).toBeNull();
    expect(item.title).toBe("Synthetic shelf item");
    expect(item.seo?.slug).toBe("synthetic-shelf-item");
  });

  test("opens the fixture by slug and by id", async ({ request }) => {
    const bySlug = await request.get(`${API}/api/catalog/products/slug/synthetic-shelf-item`);
    expect(bySlug.status()).toBe(200);
    expect((await bySlug.json()).product.sku).toBe("BZ-E2E-VISIBLE-001");

    const byId = await request.get(`${API}/api/catalog/products/pim_prod_e2e_visible`);
    expect(byId.status()).toBe(200);
    expect((await byId.json()).product.sku).toBe("BZ-E2E-VISIBLE-001");
  });

  test("ignores anonymous ?preview=1 (hidden demo stays hidden)", async ({ request }) => {
    const list = await request.get(`${API}/api/catalog/products?preview=1`);
    expect(list.ok()).toBeTruthy();
    const skus = ((await list.json()).items || []).map((row: { sku?: string }) => row.sku);
    expect(skus).not.toContain("BZ-CORE-DEMO-001");
    expect(skus).toContain("BZ-E2E-VISIBLE-001");

    const demo = await request.get(`${API}/api/catalog/products/pim_prod_demo001?preview=1`);
    expect(demo.status()).toBe(404);
  });
});
