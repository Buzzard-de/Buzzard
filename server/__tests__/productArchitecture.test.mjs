import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const architecture = require("../lib/pim/productArchitecture");
const catalogProductSync = require("../lib/catalogProductSync");

describe("product architecture inventory", () => {
  it("keeps Product SoT inactive and dual-write forbidden", () => {
    const map = architecture.getProductArchitecture();
    expect(map.productSourceOfTruthActive).toBe(false);
    expect(map.dualWrite).toBe(false);
    expect(map.candidate.selected).toBe(false);
    expect(map.candidate.activated).toBe(false);
    expect(map.candidate.table).toBe("pim_core_products");
    expect(map.stores).toContain("data/buzzard_products.json");
  });

  it("classifies every declared master writer against source files", () => {
    for (const writer of architecture.MASTER_WRITERS) {
      const file = path.join(process.cwd(), writer.module);
      expect(fs.existsSync(file), writer.module).toBe(true);
      const source = fs.readFileSync(file, "utf8");
      expect(source).toContain("productWriteBoundary");
      expect(writer.boundary).toMatch(/authorize/);
    }
  });

  it("keeps catalog sync as an unrouted projection", () => {
    const row = architecture.CLASSIFIED_NON_MASTER.find((item) => item.id === "catalogProductSync.syncCatalogProducts");
    expect(row.class).toBe("D_PROJECTION");
    const result = catalogProductSync.syncCatalogProducts();
    expect(result.kind).toBe("projection");
    expect(result.dualWrite).toBe(false);
    expect(result.boundaryRouted).toBe(false);
    expect(result.productSourceOfTruthActive).toBe(false);
  });

  it("keeps storefront PDP slugs separate from the PIM API catalog", () => {
    const map = architecture.getProductArchitecture();
    expect(map.catalogRouting.unified).toBe(false);
    expect(map.catalogRouting.dualPublish).toBe(false);
    expect(map.catalogRouting.storefrontPdp.includesPimApiSlugs).toBe(false);
    expect(map.catalogRouting.storefrontPdp.source).toContain("buzzard_products.json");
    expect(map.catalogRouting.apiCatalog.source).toContain("pim_core_products");
    expect(map.catalogRouting.storefrontPdp.outputExportProduction).toBe(true);

    const catalog = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "data/buzzard_products.json"), "utf8")
    );
    const jsonSlugs = (catalog.products || [])
      .filter((row) => row.status === "active" && row.seo?.slug)
      .map((row) => row.seo.slug);
    expect(jsonSlugs).toContain("premium-bremsscheibe-testprodukt");
    expect(jsonSlugs).not.toContain("isolated-cart-fixture");
  });

  it("lists storefront readers that still prevent SoT activation", () => {
    const ids = architecture.READERS.map((row) => row.id);
    expect(ids).toContain("catalogReadService");
    expect(ids).toContain("productStore.listProducts");
    expect(ids).toContain("catalogSeo.listProducts");
  });

  it("simulates SoT migration without writing or activating", () => {
    const { simulateProductMigration } = require("../lib/pim/productMigrationPlan");
    const plan = simulateProductMigration();
    expect(plan.simulation).toBe(true);
    expect(plan.written).toBe(false);
    expect(plan.dualWrite).toBe(false);
    expect(plan.productSourceOfTruthActive).toBe(false);
    expect(plan.candidate.activated).toBe(false);
    expect(plan.nextUnauthorized).toContain("activate SoT");
  });
});
