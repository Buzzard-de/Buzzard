/**
 * Consolidated PIM health report — diagnostic only, no mutations.
 */
const { db } = require("../db");
const { checkProductionSafety } = require("./productionSafetyGate");
const { getStagingStats } = require("./productStagingService");
const { evaluateProductQualityReadiness } = require("./productQualityReadinessCenter");
const catalogReadService = require("../storefront/catalogReadService");
const { isDemoOrTestProduct, KNOWN_DEMO_SKUS } = require("./demoProductGuard");
const { resolveProductWorkflowStatus, PIM_WORKFLOW_STATUS } = require("../../core/pimWorkflowConstants");
const productValidation = require("./productValidation");
const { createConnectorFromEnv } = require("../supplier/realSupplierConnector");
const goLiveApproval = require("../commerce/goLiveApproval");

function countProductsByStatus() {
  const rows = db.prepare("SELECT status, COUNT(*) AS n FROM pim_core_products GROUP BY status").all();
  return Object.fromEntries(rows.map((r) => [r.status, r.n]));
}

function countProductsByVisibility() {
  const rows = db.prepare("SELECT visibility, COUNT(*) AS n FROM pim_core_products GROUP BY visibility").all();
  return Object.fromEntries(rows.map((r) => [r.visibility, r.n]));
}

function countSupplierDistribution() {
  const rows = db
    .prepare(
      `SELECT COALESCE(supplier_id, 'unknown') AS supplier, COUNT(*) AS n
       FROM pim_core_products GROUP BY supplier_id`
    )
    .all();
  return Object.fromEntries(rows.map((r) => [r.supplier, r.n]));
}

function findDuplicateSkus() {
  return db
    .prepare(
      `SELECT sku, COUNT(*) AS n FROM pim_core_products
       GROUP BY sku HAVING n > 1`
    )
    .all();
}

function findDuplicateEans() {
  return db
    .prepare(
      `SELECT COALESCE(ean, gtin) AS ean, COUNT(*) AS n FROM pim_core_products
       WHERE ean IS NOT NULL OR gtin IS NOT NULL
       GROUP BY COALESCE(ean, gtin) HAVING n > 1`
    )
    .all();
}

function countMissingImages() {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM pim_core_products p
       WHERE NOT EXISTS (
         SELECT 1 FROM pim_core_media m WHERE m.product_id = p.id AND m.media_type = 'image'
       )`
    )
    .get();
  return row?.n || 0;
}

function countMissingCategories() {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM pim_core_products
       WHERE taxonomy_category_id IS NULL OR TRIM(taxonomy_category_id) = ''`
    )
    .get();
  return row?.n || 0;
}

function countDemoProducts() {
  const rows = db.prepare("SELECT id, sku, title, brand_id FROM pim_core_products").all();
  let count = 0;
  const samples = [];
  for (const row of rows) {
    if (isDemoOrTestProduct({ id: row.id, sku: row.sku, title: row.title })) {
      count += 1;
      if (samples.length < 10) samples.push(row.sku);
    }
  }
  return { count, samples, knownDemoSkus: [...KNOWN_DEMO_SKUS] };
}

function countWorkflowBuckets() {
  const rows = db.prepare("SELECT * FROM pim_core_products").all();
  const buckets = Object.fromEntries(Object.values(PIM_WORKFLOW_STATUS).map((s) => [s, 0]));

  for (const row of rows) {
    let metadata = {};
    try {
      metadata = row.metadata_json ? JSON.parse(row.metadata_json) : {};
    } catch {
      metadata = {};
    }
    const product = {
      id: row.id,
      sku: row.sku,
      title: row.title,
      status: row.status,
      visibility: row.visibility,
      metadata,
    };
    const validation = productValidation.validateProduct({
      sku: row.sku,
      ean: row.ean,
      gtin: row.gtin,
      brandId: row.brand_id,
      title: row.title,
      description: row.description,
      category: row.taxonomy_category_id,
      images: [],
      price: row.price,
      stock: row.stock,
      supplier: row.supplier_id,
      id: row.id,
    });
    const workflow = resolveProductWorkflowStatus(product, { validationOverall: validation.overall });
    buckets[workflow] = (buckets[workflow] || 0) + 1;
  }

  return buckets;
}

function buildPimHealthReport() {
  const safety = checkProductionSafety();
  const qualityReadiness = evaluateProductQualityReadiness();
  const publicCatalog = catalogReadService.getHealth();
  const supplier = createConnectorFromEnv().getStatus();
  const staging = getStagingStats();
  const totalProducts = db.prepare("SELECT COUNT(*) AS n FROM pim_core_products").get()?.n || 0;
  const workflow = countWorkflowBuckets();
  const demo = countDemoProducts();
  const duplicateSkus = findDuplicateSkus();
  const duplicateEans = findDuplicateEans();

  const validProducts = workflow[PIM_WORKFLOW_STATUS.VALIDATED] + workflow[PIM_WORKFLOW_STATUS.READY_FOR_REVIEW] + workflow[PIM_WORKFLOW_STATUS.APPROVED];
  const invalidProducts = workflow[PIM_WORKFLOW_STATUS.INVALID] + workflow[PIM_WORKFLOW_STATUS.PUBLISH_BLOCKED];
  const reviewRequired = workflow[PIM_WORKFLOW_STATUS.REVIEW_REQUIRED];

  return {
    timestamp: new Date().toISOString(),
    diagnosticOnly: true,
    autoActivate: false,
    activationAllowed: false,
    humanApprovalRequired: true,
    publishBlocked: true,
    liveSupplierContacted: false,
    salesEnabled: process.env.BUZZARD_SALES_ENABLED === "1",
    safety: {
      ok: safety.ok,
      issues: safety.issues,
      goLiveLock: goLiveApproval.PRODUCTION_SAFETY_LOCK,
      supplierLiveImport: process.env.REAL_SUPPLIER_LIVE_IMPORT === "1",
      supplierDryRun: process.env.REAL_SUPPLIER_DRY_RUN !== "0",
    },
    summary: {
      totalProducts,
      validProducts,
      invalidProducts,
      reviewRequired,
      missingImages: countMissingImages(),
      missingCategories: countMissingCategories(),
      duplicateSkus: duplicateSkus.length,
      duplicateEans: duplicateEans.length,
      publishBlocked: workflow[PIM_WORKFLOW_STATUS.PUBLISH_BLOCKED] + workflow[PIM_WORKFLOW_STATUS.INVALID],
      demoProducts: demo.count,
      publicCatalogProducts: publicCatalog.productCount,
      stagingRecords: Object.values(staging).reduce((a, b) => a + b, 0),
    },
    workflow,
    byStatus: countProductsByStatus(),
    byVisibility: countProductsByVisibility(),
    supplierDistribution: countSupplierDistribution(),
    staging,
    demo,
    duplicates: {
      skus: duplicateSkus,
      eans: duplicateEans,
    },
    supplier: {
      credentialsConfigured: supplier.credentialsConfigured,
      blockedReason: supplier.blockedReason || null,
      dryRunOnly: !supplier.credentialsConfigured,
    },
    qualityReadiness: qualityReadiness.PRODUCT_QUALITY_READINESS,
    publicCatalog,
  };
}

module.exports = {
  buildPimHealthReport,
  countMissingImages,
  countMissingCategories,
  findDuplicateSkus,
  findDuplicateEans,
};
