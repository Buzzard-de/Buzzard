/**
 * Part 17 — Catalog readiness checks (PUBLIC PRODUCTS = 0 is OK without supplier).
 */
const catalogReadService = require("../storefront/catalogReadService");
const { isDemoOrTestProduct } = require("../pim/demoProductGuard");
const { runValidationPipeline } = require("../pim/productValidationPipeline");
const { evaluateProductQuality } = require("../pim/productQualityReadiness");
const { READINESS_GATE_STATUS } = require("../../core/operationsConstants");

function evaluateCatalogReadiness() {
  const health = catalogReadService.getHealth();
  const publicCount = health.productCount ?? 0;

  const checks = [
    {
      name: "public_product_count",
      status: READINESS_GATE_STATUS.PASS,
      detail: `${publicCount} public products (0 expected without supplier)`,
      value: publicCount,
    },
    {
      name: "demo_blocking",
      status: isDemoOrTestProduct({ sku: "BZ-CORE-DEMO-001", title: "Demo" })
        ? READINESS_GATE_STATUS.PASS
        : READINESS_GATE_STATUS.FAIL,
      detail: "Demo product guard active",
    },
    {
      name: "sales_disabled",
      status: !health.salesEnabled ? READINESS_GATE_STATUS.PASS : READINESS_GATE_STATUS.BLOCKED,
      detail: `salesEnabled=${health.salesEnabled}`,
    },
  ];

  const sampleBlocked = runValidationPipeline(
    { supplier_sku: "BLOCK-TEST", name: "Test ohne GTIN" },
    { supplierCode: "REAL-TEST-001", dryRun: true }
  );

  checks.push({
    name: "missing_gtin_blocked",
    status: sampleBlocked.blockingReasons?.includes("GTIN_MISSING")
      ? READINESS_GATE_STATUS.PASS
      : READINESS_GATE_STATUS.FAIL,
    detail: "Missing GTIN blocks staging",
  });

  const overall =
    checks.some((c) => c.status === READINESS_GATE_STATUS.FAIL)
      ? "FAIL"
      : checks.some((c) => c.status === READINESS_GATE_STATUS.BLOCKED)
        ? "BLOCKED"
        : "PASS";

  return {
    overall,
    publicProductCount: publicCount,
    checks,
    note: publicCount === 0 ? "Zero public products is expected until real supplier data" : "Review public products before go-live",
    timestamp: new Date().toISOString(),
  };
}

function evaluateSampleProductQuality(record, options) {
  return evaluateProductQuality(record, options);
}

module.exports = {
  evaluateCatalogReadiness,
  evaluateSampleProductQuality,
};
