import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  resolveProfile,
  validateCatalogCoverage,
  validateProductAttributes,
  enrichFacets,
} = require("../lib/pim/subcategoryCatalogProfile.js");

describe("subcategory catalog profiles", () => {
  it("covers all active L1 templates and L2 subcategories", () => {
    const report = validateCatalogCoverage();
    expect(report.activeL1).toBe(50);
    expect(report.templateL1).toBe(50);
    expect(report.missingL1).toEqual([]);
    expect(report.missingL2Total).toBe(0);
    expect(report.ok).toBe(true);
  });

  it("resolves automotive brake subcategory filters", () => {
    const profile = resolveProfile({ subcategoryId: "cat-05-03" });
    expect(profile.ok).toBe(true);
    expect(profile.rootSlug).toBe("automotive");
    expect(profile.filters).toContain("brand");
    expect(profile.filterAttributes).toContain("axle");
  });

  it("validates required attributes and enriches facets", () => {
    const profile = resolveProfile({ subcategorySlug: "damen-bekleidung" });
    const check = validateProductAttributes({ attributes: { color: "navy" } }, profile);
    expect(check.ok).toBe(true);
    const facets = enrichFacets(
      { brands: [], priceRange: { min: 0, max: 0 }, inStockCount: 0 },
      [{ attributes: { color: "navy", size: "M" } }, { attributes: { color: "red" } }],
      profile
    );
    expect(facets.attributeFacets.color?.length).toBeGreaterThan(0);
  });
});