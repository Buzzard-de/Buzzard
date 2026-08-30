import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createRequire } from "node:module";
import crypto from "node:crypto";

const require = createRequire(import.meta.url);

describe("demoProductGuard", () => {
  const { isDemoOrTestProduct } = require("../lib/pim/demoProductGuard.js");

  it("blocks known demo SKU", () => {
    expect(isDemoOrTestProduct({ sku: "BZ-CORE-DEMO-001", title: "Universal Demo Product" })).toBe(true);
  });

  it("blocks testprodukt title", () => {
    expect(isDemoOrTestProduct({ sku: "BUZ-AUTO-000001", title: "Premium Bremsscheibe Testprodukt" })).toBe(true);
  });

  it("allows genuine automotive SKU", () => {
    expect(isDemoOrTestProduct({ sku: "BUZ-AUTO-000002", title: "Bremsscheibe Vorderachse 280mm", brand: "ATE" })).toBe(
      false
    );
  });
});

describe("storefrontVisibility demo filter", () => {
  it("keeps demo product hidden on storefront", () => {
    const productCore = require("../lib/pim/productCore.js");
    const { isProductVisibleOnStorefront } = require("../lib/storefront/storefrontVisibility.js");
    const demo = productCore.getProduct("pim_prod_demo001");
    expect(demo).toBeTruthy();
    expect(isProductVisibleOnStorefront({ ...demo, visibility: "PUBLIC", status: "READY" })).toBe(false);
  });
});

describe("productCatalogMigration dry-run", () => {
  it("does not modify PIM Core product count", () => {
    const productCore = require("../lib/pim/productCore.js");
    const migration = require("../lib/pim/productCatalogMigration.js");
    const before = productCore.listProducts({ limit: 1000 }).length;
    migration.runDryRun({ sources: ["p1"] });
    const after = productCore.listProducts({ limit: 1000 }).length;
    expect(after).toBe(before);
  });

  it("blocks demo P1 product", () => {
    const migration = require("../lib/pim/productCatalogMigration.js");
    const { items } = migration.runDryRun({ sources: ["p1"] });
    const demo = items.find((i) => i.sku === "BUZ-AUTO-000001");
    expect(demo?.status).toBe("SKIPPED_DEMO");
  });

  it("skips duplicate demo SKU in PIM Core", () => {
    const migration = require("../lib/pim/productCatalogMigration.js");
    const { items } = migration.runDryRun({ sources: ["p1", "legacy", "pim_catalog"] });
    const dup = items.find((i) => i.sku === "BZ-CORE-DEMO-001");
    if (dup) expect(dup.status).toBe("SKIPPED_DUPLICATE");
  });

  it("reports validation failures for invalid EAN checksums", () => {
    const migration = require("../lib/pim/productCatalogMigration.js");
    const { summary } = migration.runDryRun({ sources: ["p1"] });
    expect(summary.validationFailures).toBeGreaterThan(0);
  });
});

describe("productCatalogMigration import", () => {
  const suffix = crypto.randomBytes(4).toString("hex");
  let importedSku;

  it("imports genuine product with HIDDEN visibility", () => {
    const migration = require("../lib/pim/productCatalogMigration.js");
    const productCore = require("../lib/pim/productCore.js");
    const { PRODUCT_STATUS } = require("../core/productConstants.js");

    importedSku = `P15-IMPORT-${suffix}`;
    const candidate = {
      source: "test",
      sourceId: "test-1",
      sku: importedSku,
      title: "Part 15 Import Validation Artikel",
      description: "Genuine validation article for migration pipeline verification.",
      shortDescription: "Migration validation",
      brand: "ValidationBrand",
      category: "cat-05",
      ean: null,
      gtin: null,
      price: 19.99,
      stock: 5,
      supplier: null,
      supplierSku: null,
      images: [],
      attributes: {},
      seo: {},
      variants: [],
      metadata: { migrationSource: "test" },
    };

    const evaluation = migration.evaluateCandidate(candidate);
    expect(evaluation.status).toBe("READY_TO_IMPORT");

    const result = migration.importCandidate(candidate, { actorId: "vitest" });
    expect(result.imported).toBe(true);
    expect(result.status).toBe("IMPORTED");

    const product = productCore.getProduct(importedSku);
    expect(product.status).toBe(PRODUCT_STATUS.IMPORTED);
    expect(product.visibility).toBe("HIDDEN");
  });

  it("is idempotent — duplicate SKU skipped", () => {
    const migration = require("../lib/pim/productCatalogMigration.js");
    const candidate = {
      source: "test",
      sourceId: "test-2",
      sku: importedSku,
      title: "Duplicate attempt",
      description: "Should not overwrite existing product.",
      category: "cat-05",
      price: 1,
      stock: 1,
      images: [],
      attributes: {},
      seo: {},
      variants: [],
      metadata: {},
    };
    const result = migration.importCandidate(candidate);
    expect(result.status).toBe("SKIPPED_DUPLICATE");
    expect(result.imported).toBe(false);
  });

  it("rejects invalid product", () => {
    const migration = require("../lib/pim/productCatalogMigration.js");
    const evaluation = migration.evaluateCandidate({
      source: "test",
      sourceId: "x",
      sku: "",
      title: "",
      category: "cat-05",
      images: [],
      attributes: {},
      seo: {},
      variants: [],
      metadata: {},
    });
    expect(evaluation.status).toBe("INVALID_PRODUCT");
  });
});

describe("productCatalogPublish", () => {
  it("requires validation PASS for publish dry-run", () => {
    const publish = require("../lib/pim/productCatalogPublish.js");
    const result = publish.publishDryRun("BZ-CORE-DEMO-001");
    expect(result.wouldPublish).toBe(false);
    expect(result.status).toBe("SKIPPED_DEMO");
  });

  it("does not enable sales on publish attempt", () => {
    const publish = require("../lib/pim/productCatalogPublish.js");
    const goLive = require("../lib/commerce/goLiveApproval.js");
    const result = publish.publishDryRun("BZ-CORE-DEMO-001");
    expect(result.salesWouldChange).toBe(false);
    expect(goLive.PRODUCTION_SAFETY_LOCK).toBe(true);
  });

  it("publish rejects demo product", () => {
    const publish = require("../lib/pim/productCatalogPublish.js");
    const result = publish.publishProduct("BZ-CORE-DEMO-001");
    expect(result.success).toBe(false);
    expect(result.status).toBe("SKIPPED_DEMO");
  });
});

describe("productionSafetyGate", () => {
  it("passes when sales disabled and go-live lock active", () => {
    const { checkProductionSafety } = require("../lib/pim/productionSafetyGate.js");
    const prev = process.env.BUZZARD_SALES_ENABLED;
    process.env.BUZZARD_SALES_ENABLED = "0";
    const result = checkProductionSafety();
    process.env.BUZZARD_SALES_ENABLED = prev;
    expect(result.ok).toBe(true);
    expect(result.goLiveLock).toBe(true);
  });
});

describe("category mapping", () => {
  it("maps P1 category to taxonomy", () => {
    const migration = require("../lib/pim/productCatalogMigration.js");
    const categoryEngine = require("../lib/pim/categoryEngine.js");
    const p1 = migration.loadP1Candidates().find((p) => p.sku === "BUZ-AUTO-000002");
    expect(p1?.category).toBe("cat-05-03");
    expect(categoryEngine.findTaxonomyCategory(p1.category)).toBeTruthy();
  });
});
