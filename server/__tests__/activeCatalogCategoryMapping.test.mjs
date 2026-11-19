import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
  listActiveCatalogCategories,
  mapActiveCatalogCategory,
  mapSupplierProduct,
} = require("../lib/supplier/supplierMappingService.js");

const SYNTHETIC_PRODUCT = {
  supplier_sku: "P23-VALID-001",
  name: "Bremsbelag Set Vorderachse",
  ean_gtin: "5901234123457",
  mpn: "P85073",
  brand: "ATE",
  supplier_category: "automotive/bremssystem",
  supplier_price: { amount: 24.5, currency: "EUR" },
  stock: 12,
  images: ["https://cdn.test-supplier.example.de/p85073.jpg"],
};

function stubDatabase() {
  const writes = [];
  const db = {
    prepare() {
      return {
        get() {
          return undefined;
        },
        all() {
          return [];
        },
        run(...args) {
          writes.push(args);
          throw new Error("DB_WRITE_FORBIDDEN");
        },
      };
    },
    exec() {
      writes.push(["exec"]);
      throw new Error("DB_WRITE_FORBIDDEN");
    },
    pragma() {
      return null;
    },
  };
  const dbPath = require.resolve("../lib/db.js");
  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: {
      db,
      getDatabaseHealth() {
        return { ok: false, isolated: true };
      },
    },
  };
  return writes;
}

describe("active catalog category mapping", () => {
  it("recognizes the 50 active shop categories", () => {
    const categories = listActiveCatalogCategories();
    expect(categories).toHaveLength(50);
    expect(new Set(categories.map((category) => category.id)).size).toBe(50);
    expect(categories.some((category) => category.id === "cat-05" && category.slug === "automotive")).toBe(true);
    expect(categories.some((category) => category.id === "cat-25" || category.id === "cat-43" || category.id === "cat-46")).toBe(false);
  });

  it("maps an exact supplier path onto one active catalog category", () => {
    const result = mapActiveCatalogCategory("automotive/bremssystem");
    expect(result.ok).toBe(true);
    expect(result.status).toBe("PASS");
    expect(result.categoryId).toBe("cat-05");
    expect(result.catalog).toMatchObject({
      id: "cat-05",
      slug: "automotive",
      name: "Automotive & Kfz",
      activeCategoryId: "cat-05",
      subcategoryId: "cat-05-03",
      sellable: true,
    });
    expect(result.publicProductCreated).toBe(false);
  });

  it("accepts an explicit active id, slug, and unique master code", () => {
    expect(mapActiveCatalogCategory(null, "cat-01").categoryId).toBe("cat-01");
    expect(mapActiveCatalogCategory(null, "textil").categoryId).toBe("cat-01");
    expect(mapActiveCatalogCategory(null, "bz.01").categoryId).toBe("cat-05");
  });

  it("maps a subcategory to its single active parent", () => {
    const child = mapActiveCatalogCategory(null, "cat-05-03-01");
    expect(child.ok).toBe(true);
    expect(child.categoryId).toBe("cat-05");
    expect(child.catalog.subcategoryId).toBe("cat-05-03-01");
    expect(child.catalog.activeCategoryId).not.toBe("cat-05-03-01");
    expect(mapActiveCatalogCategory("bremssystem").catalog.subcategoryId).toBe("cat-05-03");
  });

  it("resolves verified supplier path aliases to active slug paths", () => {
    const aliased = mapActiveCatalogCategory("automotive/brakes");
    expect(aliased.ok).toBe(true);
    expect(aliased.code).toBe("CATEGORY_MATCHED");
    expect(aliased.categoryId).toBe("cat-05");
    expect(aliased.catalog.subcategoryId).toBe("cat-05-03");
  });

  it("rejects retired shop ids, slugs, and master codes", () => {
    expect(mapActiveCatalogCategory(null, "cat-25").code).toBe("CATEGORY_RETIRED");
    expect(mapActiveCatalogCategory(null, "cat-43").code).toBe("CATEGORY_RETIRED");
    expect(mapActiveCatalogCategory(null, "cat-46").code).toBe("CATEGORY_RETIRED");
    expect(mapActiveCatalogCategory(null, "cat-25-01").code).toBe("CATEGORY_RETIRED");
    expect(mapActiveCatalogCategory("lebensmittel-und-getraenke/temel-g-da").code).toBe("CATEGORY_RETIRED");
    expect(mapActiveCatalogCategory("schmuck-uhren").code).toBe("CATEGORY_RETIRED");
    expect(mapActiveCatalogCategory(null, "bz.20").code).toBe("CATEGORY_RETIRED");
    expect(mapActiveCatalogCategory(null, "bz.25").code).toBe("CATEGORY_RETIRED");
    expect(mapActiveCatalogCategory(null, "bz.26").code).toBe("CATEGORY_RETIRED");
  });

  it("rejects unknown ids and unverifiable supplier text", () => {
    expect(mapActiveCatalogCategory(null, "cat-99").code).toBe("CATEGORY_UNKNOWN");
    expect(mapActiveCatalogCategory(null, "bz.99").code).toBe("CATEGORY_UNKNOWN");
    expect(mapActiveCatalogCategory(null, "not-a-category").code).toBe("CATEGORY_UNKNOWN");
    expect(mapActiveCatalogCategory(null, "").code).toBe("CATEGORY_MISSING");
    expect(mapActiveCatalogCategory("unknown/path").code).toBe("CATEGORY_UNMAPPED");
    expect(mapActiveCatalogCategory("brakes").code).toBe("CATEGORY_UNMAPPED");
    expect(mapActiveCatalogCategory("??").code).toBe("CATEGORY_UNMAPPED");
  });

  it("does not treat hub ids as sellable product categories", () => {
    for (const hub of ["cat-54", "cat-55", "cat-56", "reifen-felgen"]) {
      const result = mapActiveCatalogCategory(null, hub);
      expect(result.code).toBe("CATEGORY_HUB");
      expect(result.ok).toBe(false);
      expect(result.sellable).toBe(false);
      expect(result.catalog).toBeNull();
      expect(result.categoryId).toBeNull();
    }
  });

  it("returns CATEGORY_AMBIGUOUS for multi-target master codes", () => {
    for (const code of ["bz.12", "bz.36", "bz.38", "bz.40"]) {
      const result = mapActiveCatalogCategory(null, code);
      expect(result.code).toBe("CATEGORY_AMBIGUOUS");
      expect(result.catalog).toBeNull();
      expect(result.categoryId).toBeNull();
      expect(result.candidates.length).toBeGreaterThan(1);
    }
    expect(mapActiveCatalogCategory(null, "bz.12").candidates).toEqual(["cat-12", "cat-37"]);
  });

  it("binds a synthetic product to the catalog category without publishing it", () => {
    stubDatabase();
    const result = mapSupplierProduct(SYNTHETIC_PRODUCT, { supplierId: "synthetic-dry" });
    expect(result.status).toBe("PASS");
    expect(result.mapped.internalSku).toBe("P23-VALID-001");
    expect(result.mapped.gtin).toBe("5901234123457");
    expect(result.mapped.mpn).toBe("P85073");
    expect(result.catalog).toMatchObject({
      sku: "P23-VALID-001",
      ean: "5901234123457",
      gtin: "5901234123457",
      mpn: "P85073",
      brand: "ATE",
      supplierId: "synthetic-dry",
      activeCategoryId: "cat-05",
      supplierCategory: "automotive/bremssystem",
      subcategoryId: "cat-05-03",
      publicProductCreated: false,
      published: false,
      pimWrite: false,
    });
    expect(result.publicProductCreated).toBe(false);
    expect(result.published).toBe(false);
  });

  it("rejects missing and invalid required catalog fields", () => {
    stubDatabase();
    const cases = [
      [{ ...SYNTHETIC_PRODUCT, supplier_sku: "" }, "synthetic-dry", "supplierSku"],
      [{ ...SYNTHETIC_PRODUCT, supplier_sku: "test-sku" }, "synthetic-dry", "supplierSku"],
      [{ ...SYNTHETIC_PRODUCT, ean_gtin: "" }, "synthetic-dry", "gtin"],
      [{ ...SYNTHETIC_PRODUCT, mpn: "" }, "synthetic-dry", "mpn"],
      [{ ...SYNTHETIC_PRODUCT, brand: "" }, "synthetic-dry", "brand"],
      [{ ...SYNTHETIC_PRODUCT }, "", "supplierId"],
      [{ ...SYNTHETIC_PRODUCT }, "unknown", "supplierId"],
      [{ ...SYNTHETIC_PRODUCT, supplier_category: "" }, "synthetic-dry", "supplierCategory"],
      [{ ...SYNTHETIC_PRODUCT, supplier_category: "supplier/unmapped/part" }, "synthetic-dry", "category"],
    ];
    for (const [record, supplierId, field] of cases) {
      const result = mapSupplierProduct(record, { supplierId });
      expect(result.ok).toBe(false);
      expect(result.status).toBe("BLOCKED");
      expect(result.pimWrite).toBe(false);
      expect(result.findings.some((finding) => finding.field === field)).toBe(true);
    }
  });

  it("keeps a bad GTIN blocked without changing the category decision", () => {
    stubDatabase();
    const result = mapSupplierProduct(
      { ...SYNTHETIC_PRODUCT, ean_gtin: "4006633001234" },
      { supplierId: "synthetic-dry" }
    );
    expect(result.status).toBe("BLOCKED");
    expect(result.findings.some((finding) => finding.field === "gtin")).toBe(true);
    expect(result.mapped.categoryId).toBe("cat-05");
    expect(result.publicProductCreated).toBe(false);
  });
});

describe("catalog publish does not create a public product", () => {
  it("returns not found and writes nothing for a missing synthetic sku", () => {
    const writes = stubDatabase();
    const publish = require("../lib/pim/productCatalogPublish.js");
    const missing = publish.publishProduct("SYN-NO-PRODUCT");
    const dry = publish.publishDryRun("SYN-NO-PRODUCT");

    expect(missing.success).toBe(false);
    expect(missing.status).toBe(publish.PUBLISH_STATUS.NOT_FOUND);
    expect(dry.dryRun).toBe(true);
    expect(dry.wouldPublish).toBe(false);
    expect(dry.salesWouldChange).toBe(false);
    expect(dry.paymentsWouldChange).toBe(false);
    expect(writes).toEqual([]);
  });
});
