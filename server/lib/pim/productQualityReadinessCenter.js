/**
 * Part 22 — Product quality readiness center (supplier-independent diagnostic).
 */
const { evaluateProductQualityHardening } = require("./productQualityHardening");
const { getStagingStats } = require("./productStagingService");
const { evaluateCatalogReadiness } = require("../operations/catalogReadiness");
const catalogReadService = require("../storefront/catalogReadService");
const { createConnectorFromEnv } = require("../supplier/realSupplierConnector");
const { QUALITY_STATUS } = require("../../core/productQualityHardeningConstants");

const SAMPLE_VALID = {
  supplier_sku: "P22-SAMPLE-001",
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

function runSampleEvaluations() {
  const valid = evaluateProductQualityHardening(
    { ...SAMPLE_VALID, supplierCode: "REAL-WHOLESALER-001" },
    { supplierCode: "REAL-WHOLESALER-001" }
  );
  const missingGtin = evaluateProductQualityHardening(
    { ...SAMPLE_VALID, ean_gtin: null, supplierCode: "REAL-WHOLESALER-001" },
    { supplierCode: "REAL-WHOLESALER-001" }
  );

  return {
    validProduct: { status: valid.status, score: valid.score },
    missingGtin: { status: missingGtin.status, blockingReasons: missingGtin.blockingReasons },
    pipelineOperational: valid.status === QUALITY_STATUS.PASS || valid.status === QUALITY_STATUS.CONDITION,
  };
}

function evaluateProductQualityReadiness() {
  const catalog = evaluateCatalogReadiness();
  const staging = getStagingStats();
  const publicCatalog = catalogReadService.getHealth();
  const supplier = createConnectorFromEnv().getStatus();
  const samples = runSampleEvaluations();

  const gates = [
    {
      gate: "SUPPLIER_INDEPENDENT",
      status: !supplier.credentialsConfigured ? "PASS" : "CONDITION",
      detail: supplier.blockedReason || "no_credentials",
    },
    {
      gate: "PUBLIC_CATALOG",
      status: publicCatalog.productCount === 0 ? "PASS" : "CONDITION",
      detail: `publicProducts=${publicCatalog.productCount}`,
    },
    {
      gate: "STAGING_BUFFER",
      status: "PASS",
      detail: `stagingRecords=${staging.total || 0}`,
    },
    {
      gate: "QUALITY_PIPELINE",
      status: samples.pipelineOperational ? "PASS" : "BLOCKED",
      detail: `validSample=${samples.validProduct.status}`,
    },
    {
      gate: "IDENTITY_VALIDATION",
      status: samples.missingGtin.status === "BLOCKED" ? "PASS" : "FAIL",
      detail: "missing GTIN correctly blocked",
    },
  ];

  const summary = {
    pass: gates.filter((g) => g.status === "PASS").length,
    fail: gates.filter((g) => g.status === "FAIL" || g.status === "BLOCKED").length,
    condition: gates.filter((g) => g.status === "CONDITION").length,
  };

  const overall =
    summary.fail > 0 ? "NOT_READY" : summary.condition > 0 ? "CONDITION" : "READY";

  return {
    PRODUCT_QUALITY_READINESS: {
      overall,
      diagnosticOnly: true,
      autoActivate: false,
      supplierIndependent: true,
      gates,
      summary,
      catalog: catalog.overall,
      staging,
      publicProductCount: publicCatalog.productCount,
      samples,
      timestamp: new Date().toISOString(),
    },
  };
}

module.exports = {
  evaluateProductQualityReadiness,
  runSampleEvaluations,
  SAMPLE_VALID,
};
