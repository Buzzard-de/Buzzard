import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createRequire } from "node:module";
import crypto from "node:crypto";

const require = createRequire(import.meta.url);

describe("productConstants", () => {
  it("controls lifecycle transitions", () => {
    const { canTransition, PRODUCT_STATUS } = require("../core/productConstants.js");
    expect(canTransition(PRODUCT_STATUS.DRAFT, PRODUCT_STATUS.IMPORTED)).toBe(true);
    expect(canTransition(PRODUCT_STATUS.BLOCKED, PRODUCT_STATUS.ACTIVE)).toBe(false);
    expect(canTransition(PRODUCT_STATUS.READY, PRODUCT_STATUS.ACTIVE)).toBe(true);
  });

  it("blocks sale preparation when sales disabled", () => {
    const { canPrepareForSale, PRODUCT_STATUS } = require("../core/productConstants.js");
    expect(canPrepareForSale(PRODUCT_STATUS.ACTIVE)).toBe(false);
  });
});

describe("productIdentifiers", () => {
  it("detects duplicate SKU", () => {
    const productIdentifiers = require("../lib/pim/productIdentifiers.js");
    const dup = productIdentifiers.findDuplicate("sku", "BZ-CORE-DEMO-001");
    expect(dup?.sku).toBe("BZ-CORE-DEMO-001");
  });
});

describe("brandService", () => {
  it("lists brands", () => {
    const brandService = require("../lib/pim/brandService.js");
    const brands = brandService.listBrands();
    expect(brands.length).toBeGreaterThan(0);
  });

  it("prevents duplicate brand names", () => {
    const brandService = require("../lib/pim/brandService.js");
    expect(() => brandService.createBrand({ name: "Buzzard Demo" })).toThrow(/already exists/i);
  });
});

describe("categoryEngine", () => {
  it("finds taxonomy category by id and slug", () => {
    const categoryEngine = require("../lib/pim/categoryEngine.js");
    expect(categoryEngine.findTaxonomyCategory("cat-05")?.slug).toBe("automotive");
    expect(categoryEngine.findTaxonomyCategory("automotive")?.id).toBe("cat-05");
  });

  it("returns mapping for category", () => {
    const categoryEngine = require("../lib/pim/categoryEngine.js");
    const mapping = categoryEngine.getMapping("cat-05");
    expect(mapping.exists).toBe(true);
  });
});

describe("productValidation", () => {
  it("validates demo product", () => {
    const productCore = require("../lib/pim/productCore.js");
    const productValidation = require("../lib/pim/productValidation.js");
    const product = productCore.getProduct("pim_prod_demo001");
    const result = productValidation.validateProduct(product);
    expect(result.overall).toBeDefined();
    expect(result.results.length).toBeGreaterThan(5);
  });
});

describe("importPipeline", () => {
  it("runs dry-run pipeline with stages", async () => {
    const importPipeline = require("../lib/pim/importPipeline.js");
    const result = await importPipeline.runPipeline(
      { sku: `DRY-${crypto.randomBytes(4).toString("hex")}`, title: "Dry Import", ean: "4006381333934" },
      { dryRun: true }
    );
    expect(result.dryRun).toBe(true);
    expect(result.stages.some((s) => s.stage === "validation")).toBe(true);
  });
});

describe("productCore lifecycle", () => {
  const suffix = crypto.randomBytes(4).toString("hex");
  let productId;

  it("creates and transitions product", () => {
    const productCore = require("../lib/pim/productCore.js");
    const { PRODUCT_STATUS } = require("../core/productConstants.js");
    const product = productCore.createProduct(
      { sku: `UNIT-${suffix}`, title: "Unit Test Product", category: "cat-05" },
      { source: "SYSTEM", actorId: "vitest" }
    );
    productId = product.id;
    expect(product.status).toBe(PRODUCT_STATUS.DRAFT);
    const updated = productCore.transitionStatus(productId, PRODUCT_STATUS.IMPORTED, {
      source: "SYSTEM",
      actorId: "vitest",
    });
    expect(updated.status).toBe(PRODUCT_STATUS.IMPORTED);
  });

  it("blocks ACTIVE when sales disabled", () => {
    const productCore = require("../lib/pim/productCore.js");
    const { PRODUCT_STATUS } = require("../core/productConstants.js");
    productCore.transitionStatus(productId, PRODUCT_STATUS.VALIDATING, { source: "SYSTEM", actorId: "vitest" });
    productCore.transitionStatus(productId, PRODUCT_STATUS.READY, { source: "SYSTEM", actorId: "vitest" });
    expect(() =>
      productCore.transitionStatus(productId, PRODUCT_STATUS.ACTIVE, { source: "SYSTEM", actorId: "vitest" })
    ).toThrow(/Sales disabled/i);
  });
});

describe("variantService", () => {
  it("adds variant to demo product", () => {
    const variantService = require("../lib/pim/variantService.js");
    const suffix = crypto.randomBytes(3).toString("hex");
    const variant = variantService.addVariant("pim_prod_demo001", {
      sku: `VAR-${suffix}`,
      axis: "size",
      value: "M",
    });
    expect(variant.axis).toBe("size");
  });
});

describe("seoService", () => {
  it("updates SEO with slug", () => {
    const seoService = require("../lib/pim/seoService.js");
    const slug = `demo-seo-${crypto.randomBytes(3).toString("hex")}`;
    const seo = seoService.updateSeo("pim_prod_demo001", { slug, metaTitle: "Demo SEO" });
    expect(seo.slug).toBe(slug);
  });
});

describe("productSearch", () => {
  it("searches by SKU prefix", () => {
    const productSearch = require("../lib/pim/productSearch.js");
    const results = productSearch.search({ q: "BZ-CORE" });
    expect(results.length).toBeGreaterThan(0);
  });
});

describe("productAudit", () => {
  it("lists audit for demo product", () => {
    const productAudit = require("../lib/pim/productAudit.js");
    const rows = productAudit.listAudit("pim_prod_demo001", 5);
    expect(Array.isArray(rows)).toBe(true);
  });
});

describe("qualityScore", () => {
  it("computes score for demo product", () => {
    const qualityScore = require("../lib/pim/qualityScore.js");
    const result = qualityScore.updateScore("pim_prod_demo001");
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe("productAiFoundation", () => {
  it("requires approval for suggestions", () => {
    const productAiFoundation = require("../lib/pim/productAiFoundation.js");
    const productCore = require("../lib/pim/productCore.js");
    const product = productCore.getProduct("pim_prod_demo001");
    const suggestion = productAiFoundation.suggest(product, "title_generation");
    expect(suggestion.requiresApproval).toBe(true);
    expect(suggestion.autoApply).toBe(false);
  });
});

describe("supplierMapping", () => {
  it("creates mapping in dry context", () => {
    const supplierMapping = require("../lib/pim/supplierMapping.js");
    const suffix = crypto.randomBytes(3).toString("hex");
    const mapping = supplierMapping.createMapping({
      supplierId: "mock",
      supplierSku: `SUP-${suffix}`,
      internalProductId: "pim_prod_demo001",
      internalSku: "BZ-CORE-DEMO-001",
      confidence: 0.9,
    });
    expect(mapping.supplierId).toBe("mock");
  });
});

describe("attributeSchema", () => {
  it("loads automotive attribute schema", () => {
    const attributeSchema = require("../lib/pim/attributeSchema.js");
    const schema = attributeSchema.getSchema("cat-05");
    expect(schema?.attributes?.length).toBeGreaterThan(0);
  });
});

describe("mediaService", () => {
  it("validates media state", () => {
    const mediaService = require("../lib/pim/mediaService.js");
    const result = mediaService.validateMedia("pim_prod_demo001");
    expect(result).toHaveProperty("images");
  });
});

describe("jobHandlers Part 6", () => {
  it("has all job types including PIM", () => {
    const { HANDLERS } = require("../lib/jobHandlers.js");
    const { JOB_TYPES } = require("../core/jobConstants.js");
    for (const t of Object.values(JOB_TYPES)) {
      expect(HANDLERS[t]).toBeTypeOf("function");
    }
  });

  it("handles PRODUCT_VALIDATE job", async () => {
    const { executeJob } = require("../lib/jobHandlers.js");
    const productCore = require("../lib/pim/productCore.js");
    const product = productCore.getProduct("pim_prod_demo001");
    const result = await executeJob({
      id: "test_job",
      jobType: "PRODUCT_VALIDATE",
      payload: { product },
    });
    expect(result.overall).toBeDefined();
  });
});
