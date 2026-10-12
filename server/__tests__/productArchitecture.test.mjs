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

  it("lists storefront readers that still prevent SoT activation", () => {
    const ids = architecture.READERS.map((row) => row.id);
    expect(ids).toContain("catalogReadService");
    expect(ids).toContain("productStore.listProducts");
    expect(ids).toContain("catalogSeo.listProducts");
  });
});
