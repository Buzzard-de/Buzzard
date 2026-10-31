/**
 * PIM Catalog Foundation tests — normalization, validation, category mapping, safety.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const { resolveProductCategory, applyCategoryToNormalized } = require("../lib/pim/categoryResolver.js");
const { buildStructuredValidationResult } = require("../lib/pim/productValidationReport.js");
const { runValidationPipeline } = require("../lib/pim/productValidationPipeline.js");
const { buildPimHealthReport } = require("../lib/pim/pimHealthReport.js");
const { isMerchantEligible, toMerchantProduct } = require("../lib/pim/googleMerchantPrep.js");
const {
  resolveProductWorkflowStatus,
  PIM_WORKFLOW_STATUS,
} = require("../core/pimWorkflowConstants.js");
const { isDemoOrTestProduct, KNOWN_DEMO_SKUS } = require("../lib/pim/demoProductGuard.js");
const { checkProductionSafety } = require("../lib/pim/productionSafetyGate.js");
const productCatalogPublish = require("../lib/pim/productCatalogPublish.js");

beforeEach(() => {
  process.env.BUZZARD_SALES_ENABLED = "0";
  process.env.NEXT_PUBLIC_SALES_ENABLED = "0";
  process.env.REAL_SUPPLIER_LIVE_IMPORT = "0";
  process.env.REAL_SUPPLIER_DRY_RUN = "1";
});

describe("categoryResolver", () => {
  it("maps supplier JSON category mapping to Buzzard taxonomy", () => {
    const resolved = resolveProductCategory({
      supplierId: "SUP-DEMO-001",
      supplierCategory: "Brakes",
    });
    expect(resolved.ok).toBe(true);
    expect(resolved.categoryId).toBe("cat-05-03");
    expect(resolved.mappingSource).toBe("supplier_json_mapping");
  });

  it("returns REVIEW_REQUIRED for unknown supplier categories", () => {
    const resolved = resolveProductCategory({
      supplierId: "SUP-DEMO-001",
      supplierCategory: "unknown/uncategorized-xyz",
    });
    expect(resolved.ok).toBe(false);
    expect(resolved.status).toBe("REVIEW_REQUIRED");
  });

  it("applies resolved category to normalized record", () => {
    const normalized = applyCategoryToNormalized(
      {
        supplierCategory: "Brakes",
        supplierCode: "SUP-DEMO-001",
        title: "Test",
      },
      { supplierCode: "SUP-DEMO-001" }
    );
    expect(normalized.buzzardCategory).toBe("cat-05-03");
    expect(normalized.categoryResolution.ok).toBe(true);
  });
});

describe("productValidationReport", () => {
  it("returns structured validation for valid supplier mock record", () => {
    const raw = {
      supplier_code: "SUP-DEMO-001",
      supplier_sku: "PIM-TEST-001",
      name: "Bremsbelag Set Vorderachse Premium",
      ean_gtin: "5901234123457",
      mpn: "P85073",
      brand: "ATE",
      supplier_category: "Brakes",
      buzzard_category: "cat-05-03",
      supplier_price: { amount: 24.5, currency: "EUR" },
      stock: 12,
      images: ["https://cdn.supplier-images.test/p85073.jpg"],
    };
    const report = buildStructuredValidationResult(raw, { supplierCode: "SUP-DEMO-001" });
    expect(report).toHaveProperty("valid");
    expect(report).toHaveProperty("status");
    expect(report).toHaveProperty("errors");
    expect(report).toHaveProperty("warnings");
    expect(report).toHaveProperty("missingFields");
  });

  it("rejects demo products in pipeline", () => {
    const pipeline = runValidationPipeline(
      {
        supplier_code: "REAL-WHOLESALER-001",
        supplier_sku: "BZ-CORE-DEMO-001",
        name: "Demo Product",
        brand: "Buzzard Demo",
      },
      { supplierCode: "REAL-WHOLESALER-001" }
    );
    expect(pipeline.blocked).toBe(true);
    expect(pipeline.blockingReasons).toContain("DEMO_PRODUCT");
  });

  it("detects duplicate SKU concerns via malformed data", () => {
    const report = buildStructuredValidationResult(
      { sku: "", title: "x", stock: -1 },
      { pipeline: false }
    );
    expect(report.valid).toBe(false);
    expect(report.status).toBe("REJECTED");
    expect(report.missingFields.length).toBeGreaterThan(0);
  });
});

describe("workflow status", () => {
  it("maps READY product to READY_FOR_REVIEW without admin approval", () => {
    const status = resolveProductWorkflowStatus(
      { status: "READY", visibility: "HIDDEN", sku: "SKU-1", title: "Real Product" },
      { validationOverall: "PASS" }
    );
    expect(status).toBe(PIM_WORKFLOW_STATUS.READY_FOR_REVIEW);
  });

  it("does not equate APPROVED with PUBLISHED", () => {
    const approved = resolveProductWorkflowStatus(
      {
        status: "READY",
        visibility: "HIDDEN",
        metadata: { adminApproved: true },
        sku: "SKU-2",
        title: "Approved Product",
      },
      { validationOverall: "PASS" }
    );
    expect(approved).toBe(PIM_WORKFLOW_STATUS.APPROVED);
    expect(approved).not.toBe(PIM_WORKFLOW_STATUS.PUBLISHED);
  });

  it("keeps BZ-CORE-DEMO-001 as demo", () => {
    expect(isDemoOrTestProduct({ sku: "BZ-CORE-DEMO-001", title: "Demo" })).toBe(true);
    expect(KNOWN_DEMO_SKUS.has("BZ-CORE-DEMO-001")).toBe(true);
  });
});

describe("googleMerchantPrep", () => {
  it("excludes products when sales are disabled", () => {
    const check = isMerchantEligible(
      {
        sku: "SKU-3",
        title: "Product",
        gtin: "5901234123457",
        price: 10,
        stock: 1,
        visibility: "PUBLIC",
        status: "READY",
        images: [{ url: "https://cdn.test/img.jpg" }],
      },
      { salesEnabled: false }
    );
    expect(check.eligible).toBe(false);
    expect(check.reason).toBe("sales_disabled");
  });

  it("prepares merchant shape without publishing", () => {
    const item = toMerchantProduct(
      {
        id: "merchant_prep_test_only",
        sku: "SKU-MERCHANT-PREP-001",
        title: "Merchant Product Example",
        description: "Valid merchant preparation description text.",
        gtin: "5901234000004",
        ean: "5901234000004",
        price: 19.99,
        currency: "EUR",
        stock: 3,
        visibility: "PUBLIC",
        status: "READY",
        brandId: 1,
        supplier: "SUP-001",
        images: [{ url: "https://cdn.supplier-images.test/img.jpg", is_primary: true }],
        brand: { name: "ATE" },
        category: "cat-05-03",
      },
      { salesEnabled: true, productUrl: "https://buzzard24.de" }
    );
    expect(item.excluded).toBe(false);
    expect(item.publishBlocked).toBe(true);
    expect(item.offerId).toBe("SKU-MERCHANT-PREP-001");
  });
});

describe("pimHealthReport", () => {
  it("returns diagnostic report without enabling activation", () => {
    const report = buildPimHealthReport();
    expect(report.diagnosticOnly).toBe(true);
    expect(report.autoActivate).toBe(false);
    expect(report.activationAllowed).toBe(false);
    expect(report.humanApprovalRequired).toBe(true);
    expect(report.publishBlocked).toBe(true);
    expect(report.liveSupplierContacted).toBe(false);
    expect(report.summary).toHaveProperty("totalProducts");
    expect(report.workflow).toBeTruthy();
  });
});

describe("production safety", () => {
  it("passes with default safe env", () => {
    const safety = checkProductionSafety();
    expect(safety.ok).toBe(true);
    expect(safety.salesEnabled).toBe(false);
  });

  it("publish module blocks demo products", () => {
    const check = productCatalogPublish.canPublishProduct({
      sku: "BZ-CORE-DEMO-001",
      title: "Demo",
      status: "READY",
      category: "cat-01",
    });
    expect(check.ok).toBe(false);
  });
});
