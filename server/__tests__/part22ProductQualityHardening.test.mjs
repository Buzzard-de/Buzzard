import { describe, it, expect, beforeEach } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const VALID_PRODUCT = {
  supplier_sku: "P22-VALID-001",
  name: "Bremsbelag Set Vorderachse",
  ean_gtin: "5901234123457",
  mpn: "P85073",
  brand: "ATE",
  supplier_category: "automotive/brakes",
  buzzard_category: "cat-01",
  supplier_price: { amount: 24.5, currency: "EUR" },
  stock: 12,
  images: ["https://cdn.test-supplier.example.de/p85073.jpg"],
  attributes: [{ name: "width", value: "120", unit: "mm" }],
};

const SUPPLIER = "REAL-WHOLESALER-001";

function evaluate(record, options = {}) {
  const hardening = require("../lib/pim/productQualityHardening.js");
  return hardening.evaluateProductQualityHardening(
    { ...record, supplierCode: record.supplierCode || SUPPLIER },
    { supplierCode: SUPPLIER, skipDbDuplicateCheck: true, ...options }
  );
}

describe("Part 22 — valid product", () => {
  beforeEach(() => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    process.env.REAL_SUPPLIER_LIVE_IMPORT = "0";
    process.env.REAL_SUPPLIER_DRY_RUN = "1";
  });

  it("1. valid product passes or conditions with explainable score", () => {
    const result = evaluate(VALID_PRODUCT);
    expect(result.diagnosticOnly).toBe(true);
    expect(result.autoActivate).toBe(false);
    expect(result.score).toBeGreaterThan(0);
    expect(result.explainable).toBe(true);
    expect(["PASS", "CONDITION"]).toContain(result.status);
  });
});

describe("Part 22 — identity validation", () => {
  it("2. missing GTIN is BLOCKED", () => {
    const result = evaluate({ ...VALID_PRODUCT, ean_gtin: null });
    expect(result.status).toBe("BLOCKED");
    expect(result.blockingReasons).toContain("GTIN_MISSING");
    expect(result.findings.some((f) => f.code === "GTIN_MISSING" && f.field === "gtin")).toBe(true);
  });

  it("3. invalid GTIN checksum is BLOCKED", () => {
    const result = evaluate({ ...VALID_PRODUCT, ean_gtin: "4006633001234" });
    expect(result.status).toBe("BLOCKED");
    expect(result.blockingReasons).toContain("GTIN_INVALID");
  });

  it("4. missing MPN is BLOCKED", () => {
    const result = evaluate({ ...VALID_PRODUCT, mpn: null });
    expect(result.status).toBe("BLOCKED");
    expect(result.blockingReasons).toContain("MPN_MISSING");
  });

  it("5. placeholder MPN is BLOCKED", () => {
    const result = evaluate({ ...VALID_PRODUCT, mpn: "test" });
    expect(result.status).toBe("BLOCKED");
    expect(result.blockingReasons).toContain("MPN_INVALID");
  });

  it("6. missing manufacturer is BLOCKED", () => {
    const result = evaluate({ ...VALID_PRODUCT, brand: null });
    expect(result.status).toBe("BLOCKED");
    expect(result.blockingReasons).toContain("BRAND_MISSING");
  });

  it("7. invalid SKU is BLOCKED", () => {
    const result = evaluate({ ...VALID_PRODUCT, supplier_sku: "test" });
    expect(result.status).toBe("BLOCKED");
    expect(result.blockingReasons.some((c) => c.includes("SKU"))).toBe(true);
  });
});

describe("Part 22 — units and attributes", () => {
  it("8. unit normalization accepts mm", () => {
    const { normalizeUnit } = require("../lib/pim/unitNormalizer.js");
    expect(normalizeUnit("millimeter").normalized).toBe("mm");
  });

  it("9. unknown unit is CONDITION or BLOCKED", () => {
    const { evaluateAttributeQuality } = require("../lib/pim/productAttributeQuality.js");
    const result = evaluateAttributeQuality({
      attributes: [{ name: "weight", value: "10", unit: "stone" }],
    });
    expect(result.findings.some((f) => f.code === "UNIT_UNKNOWN")).toBe(true);
  });
});

describe("Part 22 — images and category", () => {
  it("10. missing image is BLOCKED", () => {
    const result = evaluate({ ...VALID_PRODUCT, images: [] });
    expect(result.status).toBe("BLOCKED");
    expect(result.blockingReasons).toContain("IMAGE_MISSING");
  });

  it("11. invalid image URL is BLOCKED", () => {
    const result = evaluate({ ...VALID_PRODUCT, images: ["not-a-url"] });
    expect(result.status).toBe("BLOCKED");
    expect(result.blockingReasons.some((c) => c.includes("IMAGE"))).toBe(true);
  });

  it("12. unknown category is BLOCKED", () => {
    const result = evaluate({ ...VALID_PRODUCT, buzzard_category: "unknown-category-xyz" });
    expect(result.status).toBe("BLOCKED");
    expect(result.blockingReasons.some((c) => c.includes("CATEGORY"))).toBe(true);
  });
});

describe("Part 22 — title and description", () => {
  it("13. bad title placeholder is BLOCKED", () => {
    const result = evaluate({ ...VALID_PRODUCT, name: "test product" });
    expect(result.status).toBe("BLOCKED");
    expect(result.findings.some((f) => f.code === "TITLE_PLACEHOLDER")).toBe(true);
  });

  it("14. bad description placeholder is BLOCKED", () => {
    const result = evaluate({ ...VALID_PRODUCT, description: "lorem ipsum placeholder" });
    expect(result.findings.some((f) => f.code === "DESCRIPTION_PLACEHOLDER")).toBe(true);
  });
});

describe("Part 22 — duplicates and scoring", () => {
  it("15. duplicate detection flags without deleting", () => {
    const { detectQualityDuplicates } = require("../lib/pim/productQualityDuplicateFlags.js");
    const fp = new Set();
    const base = {
      brand: "UniqueBrandX",
      mpn: "UNIQ-MPN-001",
      supplier_sku: "UNIQ-SKU-SAME",
    };
    const first = detectQualityDuplicates(base, { knownFingerprints: fp, skipDbDuplicateCheck: true });
    fp.add(first.fingerprint);
    const second = detectQualityDuplicates(
      { ...base, mpn: "UNIQ-MPN-002", name: "Different title" },
      { knownFingerprints: fp, skipDbDuplicateCheck: true }
    );
    expect(first.flagged).toBe(false);
    expect(second.flagged).toBe(true);
  });

  it("16. completeness score is deterministic 0-100", () => {
    const good = evaluate(VALID_PRODUCT);
    const bad = evaluate({ ...VALID_PRODUCT, ean_gtin: null, mpn: null });
    expect(good.score).toBeLessThanOrEqual(100);
    expect(bad.score).toBeLessThan(good.score);
  });

  it("17. blocked reason codes are stable and structured", () => {
    const result = evaluate({ ...VALID_PRODUCT, ean_gtin: null });
    const finding = result.findings.find((f) => f.code === "GTIN_MISSING");
    expect(finding).toMatchObject({
      code: "GTIN_MISSING",
      severity: "BLOCKED",
      field: "gtin",
    });
    expect(finding.message).toContain("GTIN");
  });
});

describe("Part 22 — readiness center", () => {
  it("18. product quality readiness is diagnostic only", () => {
    const center = require("../lib/pim/productQualityReadinessCenter.js");
    const report = center.evaluateProductQualityReadiness();
    expect(report.PRODUCT_QUALITY_READINESS.diagnosticOnly).toBe(true);
    expect(report.PRODUCT_QUALITY_READINESS.autoActivate).toBe(false);
    expect(report.PRODUCT_QUALITY_READINESS.supplierIndependent).toBe(true);
  });
});

describe("Part 22 — RBAC", () => {
  it("19. routes require proper permissions", () => {
    const { resolveRoutePermission } = require("../lib/routePermissions.js");
    expect(resolveRoutePermission("GET", "/api/health/product-quality-readiness").public).toBe(true);
    expect(resolveRoutePermission("GET", "/api/admin/catalog/product-quality").permission).toBe("products.read");
  });
});

describe("Part 22 — brand normalization", () => {
  it("20. BMW AG normalizes deterministically to BMW", () => {
    const { normalizeBrand } = require("../lib/pim/brandNormalizer.js");
    expect(normalizeBrand("BMW AG").normalized).toBe("BMW");
    expect(normalizeBrand("Unknown Brand GmbH").unknown).toBe(true);
  });
});

describe("Part 22 — safety regression", () => {
  beforeEach(() => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    process.env.BUZZARD_STRIPE_ENABLED = "0";
    process.env.BUZZARD_PAYPAL_ENABLED = "0";
    process.env.REAL_SUPPLIER_LIVE_IMPORT = "0";
    process.env.REAL_SUPPLIER_DRY_RUN = "1";
  });

  it("21. go-live lock active", () => {
    const goLiveApproval = require("../lib/commerce/goLiveApproval.js");
    expect(goLiveApproval.PRODUCTION_SAFETY_LOCK).toBe(true);
  });

  it("22. no supplier credentials", () => {
    const supplier = require("../lib/supplier/realSupplierConnector.js").createConnectorFromEnv().getStatus();
    expect(supplier.credentialsConfigured).toBe(false);
    expect(supplier.liveImportEnabled).toBe(false);
  });

  it("23. public catalog sales OFF", () => {
    const catalogReadService = require("../lib/storefront/catalogReadService.js");
    expect(catalogReadService.getHealth().salesEnabled).toBe(false);
  });
});
