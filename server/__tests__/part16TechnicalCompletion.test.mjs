import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRequire } from "node:module";
import crypto from "node:crypto";

const require = createRequire(import.meta.url);

const VALID_PRODUCT = {
  supplier_sku: "P16-VALID-001",
  name: "Bremsbelag Set Vorderachse",
  ean_gtin: "5901234123457",
  mpn: "P85073",
  brand: "ATE",
  supplier_category: "automotive/brakes",
  buzzard_category: "cat-01",
  supplier_price: { amount: 24.5, currency: "EUR" },
  stock: 12,
  images: ["https://cdn.test-supplier.example.de/p85073.jpg"],
};

describe("Part 16 — product validation pipeline", () => {
  const pipeline = require("../lib/pim/productValidationPipeline.js");

  beforeEach(() => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    process.env.REAL_SUPPLIER_LIVE_IMPORT = "0";
    process.env.REAL_SUPPLIER_DRY_RUN = "1";
  });

  it("1. accepts valid product structure in dry-run", () => {
    const result = pipeline.runValidationPipeline(VALID_PRODUCT, {
      supplierCode: "REAL-WHOLESALER-001",
      automotive: true,
    });
    expect(result.normalized).toBeTruthy();
    expect(result.stages.some((s) => s.stage === "normalization")).toBe(true);
  });

  it("2. blocks missing GTIN", () => {
    const result = pipeline.runValidationPipeline(
      { ...VALID_PRODUCT, ean_gtin: null },
      { supplierCode: "REAL-WHOLESALER-001" }
    );
    expect(result.blockingReasons).toContain("GTIN_MISSING");
    expect(result.lifecycleStatus).toBe("BLOCKED");
  });

  it("3. blocks fake/invalid GTIN checksum", () => {
    const result = pipeline.runValidationPipeline(
      { ...VALID_PRODUCT, ean_gtin: "4006633001234" },
      { supplierCode: "REAL-WHOLESALER-001" }
    );
    expect(result.blockingReasons).toContain("GTIN_INVALID");
  });

  it("4. blocks missing MPN", () => {
    const result = pipeline.runValidationPipeline(
      { ...VALID_PRODUCT, mpn: null },
      { supplierCode: "REAL-WHOLESALER-001" }
    );
    expect(result.blockingReasons).toContain("MPN_MISSING");
  });

  it("5. blocks missing supplier", () => {
    const result = pipeline.runValidationPipeline(VALID_PRODUCT, {});
    expect(result.blockingReasons).toContain("SUPPLIER_MISSING");
  });

  it("6. blocks invalid price", () => {
    const quality = require("../lib/pim/productQualityReadiness.js");
    const result = quality.evaluateProductQuality(
      {
        ...VALID_PRODUCT,
        purchasePrice: -5,
        supplierCode: "REAL-WHOLESALER-001",
        provenance: { sourceSupplierCode: "REAL-WHOLESALER-001", importedAt: new Date().toISOString() },
      },
      { requirePrice: true }
    );
    expect(result.blockingReasons.some((r) => r.includes("PRICE"))).toBe(true);
  });

  it("7. blocks invalid stock", () => {
    const priceStock = require("../lib/pim/priceStockSafety.js");
    const result = priceStock.validateStock(-1);
    expect(result.ok).toBe(false);
  });

  it("8. blocks invalid image", () => {
    const imagePipeline = require("../lib/pim/imagePipeline.js");
    const result = imagePipeline.validateImageSet(["http://insecure.example/image.jpg"]);
    expect(result.ok).toBe(false);
  });

  it("9. blocks unknown category", () => {
    const categoryValidator = require("../lib/pim/categoryMappingValidator.js");
    const result = categoryValidator.validateSupplierCategoryMapping({
      supplierCategory: "unknown/xyz/category",
      buzzardCategory: "nonexistent-category-id-99999",
    });
    expect(result.blocked).toBe(true);
  });

  it("10. detects duplicate identifiers", () => {
    const dup = require("../lib/pim/productDuplicateDetector.js");
    const productIdentifiers = require("../lib/pim/productIdentifiers.js");
    const existing = productIdentifiers.findDuplicate("ean", "5901234123457");
    expect(existing).toBeTruthy();
    const result = dup.detectDuplicates({
      sku: "P16-NEW-SKU",
      ean: "5901234123457",
      gtin: "5901234123457",
      supplierCode: "REAL-WHOLESALER-001",
    });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "DUPLICATE")).toBe(true);
  });

  it("11. rejects demo product", () => {
    const result = pipeline.runValidationPipeline(
      { ...VALID_PRODUCT, name: "Universal Demo Product", sku: "BZ-CORE-DEMO-001" },
      { supplierCode: "REAL-WHOLESALER-001" }
    );
    expect(result.lifecycleStatus).toBe("REJECTED");
    expect(result.blockingReasons).toContain("DEMO_PRODUCT");
  });
});

describe("Part 16 — staging workflow", () => {
  const staging = require("../lib/pim/productStagingService.js");

  it("12. staging dry-run does not write when blocked", () => {
    const before = staging.getStagingStats();
    const result = staging.ingestRawProduct(
      { supplier_sku: "X1", name: "No GTIN product" },
      { dryRun: true, supplierCode: "REAL-WHOLESALER-001" }
    );
    expect(result.dryRun).toBe(true);
    expect(result.blocked).toBe(true);
    expect(staging.getStagingStats()).toEqual(before);
  });
});

describe("Part 16 — publication and sales gates", () => {
  const lifecycle = require("../lib/pim/productLifecycle.js");
  const publish = require("../lib/pim/productCatalogPublish.js");
  const goLiveApproval = require("../lib/commerce/goLiveApproval.js");

  it("13. publication gate blocks demo product", () => {
    const check = lifecycle.canPublishToCatalog({ sku: "BZ-CORE-DEMO-001", title: "Demo", status: "READY" });
    expect(check.ok).toBe(false);
  });

  it("14. sales gate remains disabled", () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    const check = lifecycle.canActivateSales({ status: "ACTIVE" });
    expect(check.ok).toBe(false);
    expect(check.reason).toBe("sales_disabled");
  });

  it("15. supplier live-import gate disabled by default", () => {
    process.env.REAL_SUPPLIER_LIVE_IMPORT = "0";
    const { canAttemptLiveFetch, resolveConfig } = require("../lib/supplier/realSupplierConnector.js");
    const config = resolveConfig({
      supplierCode: "REAL-WHOLESALER-001",
      apiUrl: "https://api.example.de/catalog",
      apiKey: "secret",
      dryRun: false,
      liveImportEnabled: false,
    });
    config._apiKeyRaw = "secret";
    expect(canAttemptLiveFetch(config).reason).toBe("live_import_disabled");
  });

  it("16. payment gate — mock payment only when sales off", () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    const flags = require("../lib/commerce/commerceFeatureFlags.js").getEffectiveFlags();
    expect(flags.mockPaymentOnly).toBe(true);
    expect(flags.stripeEnabled).toBe(false);
    expect(flags.paypalEnabled).toBe(false);
  });
});

describe("Part 16 — infrastructure", () => {
  it("17. Redis fallback reports not configured without credentials", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const redisHealth = await require("../lib/productionHealth.js").getRedisHealth();
    expect(redisHealth.configured).toBe(false);
    expect(redisHealth.status).toBe("NOT_CONFIGURED");
  });

  it("18. backup validation returns structured readiness", () => {
    const backup = require("../lib/backupAutomation.js");
    const readiness = backup.getBackupReadiness();
    expect(readiness).toHaveProperty("backupDir");
    expect(readiness).toHaveProperty("retentionDays");
  });

  it("19. health endpoints modules load", async () => {
    const productionHealth = require("../lib/productionHealth.js");
    const version = productionHealth.getVersionPayload();
    expect(version).toHaveProperty("commit");
    const summary = await productionHealth.getProductionSummary();
    expect(summary).toHaveProperty("goLiveLock");
    expect(summary.commerce.salesEnabled).toBe(false);
    expect(summary.supplierIntegration.connected).toBe(false);
  });

  it("20. secret exposure prevention in connector status", () => {
    const { RealSupplierConnector } = require("../lib/supplier/realSupplierConnector.js");
    const conn = new RealSupplierConnector({
      supplierCode: "REAL-WHOLESALER-001",
      apiUrl: "https://api.example.de",
      apiKey: "top-secret-value",
    });
    const status = conn.getStatus();
    expect(JSON.stringify(status)).not.toContain("top-secret-value");
  });
});

describe("Part 16 — job safety gate", () => {
  it("blocks live supplier sync without credentials", () => {
    const { JOB_TYPES } = require("../core/jobConstants.js");
    const gate = require("../lib/jobSafetyGate.js");
    const result = gate.assertJobSafe({
      type: JOB_TYPES.SUPPLIER_SYNC,
      payload: { dryRun: false, live: true, supplierId: "REAL-WHOLESALER-001" },
    });
    expect(result.ok).toBe(false);
  });

  it("blocks test-only supplier jobs", () => {
    const { JOB_TYPES } = require("../core/jobConstants.js");
    const gate = require("../lib/jobSafetyGate.js");
    const result = gate.assertJobSafe({
      type: JOB_TYPES.SUPPLIER_SYNC,
      payload: { supplierId: "SUP-DEMO-001" },
    });
    expect(result.ok).toBe(false);
  });
});

describe("Part 16 — production safety gate", () => {
  afterEach(() => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    process.env.STRIPE_ENABLED = "0";
    process.env.PAYPAL_ENABLED = "0";
    process.env.BUZZARD_SUPPLIER_ORDERS_ENABLED = "0";
  });

  it("safety gate passes with default env", () => {
    const { checkProductionSafety } = require("../lib/pim/productionSafetyGate.js");
    const result = checkProductionSafety();
    expect(result.ok).toBe(true);
    expect(result.goLiveLock).toBe(true);
  });
});
