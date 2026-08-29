/**
 * Part 5 — Safe job handler registry (no real supplier/AI execution).
 */
const { JOB_TYPES, FAILURE_KIND } = require("../core/jobConstants");
const { appendJobLog } = require("./jobObservability");
const productSync = require("./sync/productSync");
const priceSync = require("./sync/priceSync");
const stockSync = require("./sync/stockSync");
const categoryReadiness = require("./categoryReadiness");
const integrationHealth = require("./integrationHealth");
const { runAiJobSafely } = require("./aiJobBridge");
const importPipeline = require("./pim/importPipeline");
const productValidation = require("./pim/productValidation");
const productCore = require("./pim/productCore");
const supplierMapping = require("./pim/supplierMapping");

async function handleProductSync(job) {
  return productSync.runPipeline(job.payload || {});
}

async function handlePriceSync(job) {
  return priceSync.runPipeline(job.payload || {});
}

async function handleStockSync(job) {
  return stockSync.runPipeline(job.payload || {});
}

async function handleSupplierSync(job) {
  const { getAdapter } = require("./supplier/adapterRegistry");
  const adapter = getAdapter(job.payload?.supplierId || "mock");
  const health = await adapter.healthCheck();
  if (!health.ok) {
    const err = new Error(health.error || "Supplier health check failed");
    err.failureKind = FAILURE_KIND.PROVIDER;
    throw err;
  }
  return {
    supplierId: adapter.id,
    format: adapter.format,
    capabilities: adapter.capabilities,
    synced: false,
    note: "Foundation only — no live supplier sync in Part 5",
  };
}

async function handleCategoryReadiness(job) {
  return categoryReadiness.runChecksForCategory(job.payload?.categoryId || "automotive");
}

async function handleAiTask(job) {
  return runAiJobSafely(job);
}

async function handleNotification(job) {
  return {
    delivered: false,
    channel: job.payload?.channel || "internal",
    note: "Notification foundation — not sent in Part 5",
  };
}

async function handleSystemHealth(job) {
  const health = integrationHealth.runAllHealthChecks();
  return { integrations: health.length, checkedAt: new Date().toISOString() };
}

async function handleProductImport(job) {
  const payload = job.payload || {};
  return importPipeline.runPipeline(payload.raw || payload, {
    dryRun: payload.dryRun !== false,
    supplierId: payload.supplierId || "mock",
    importJobId: payload.importJobId,
    actorId: job.createdBy,
  });
}

async function handleProductValidate(job) {
  const payload = job.payload || {};
  const product = payload.productId
    ? productCore.getProduct(payload.productId)
    : payload.product || payload.raw;
  if (!product) {
    const err = new Error("Product or productId required for PRODUCT_VALIDATE");
    err.failureKind = FAILURE_KIND.VALIDATION;
    throw err;
  }
  return productValidation.validateProduct(product);
}

async function handleProductNormalize(job) {
  const raw = job.payload?.raw || job.payload || {};
  return {
    normalized: {
      sku: raw.sku || raw.supplierSku,
      supplierSku: raw.supplierSku || raw.sku,
      ean: raw.ean,
      gtin: raw.gtin || raw.ean,
      mpn: raw.mpn,
      title: raw.title || raw.name,
      description: raw.description,
      shortDescription: raw.shortDescription,
      category: raw.category,
      brand: raw.brand,
      price: raw.price,
      stock: raw.stock,
      attributes: raw.attributes || {},
      images: raw.images || [],
    },
    dryRun: job.payload?.dryRun !== false,
  };
}

async function handleProductMapping(job) {
  const payload = job.payload || {};
  if (payload.dryRun !== false) {
    return {
      dryRun: true,
      wouldMap: {
        supplierId: payload.supplierId || "mock",
        supplierSku: payload.supplierSku,
        internalSku: payload.internalSku,
        ean: payload.ean,
      },
    };
  }
  const mapping = supplierMapping.createMapping({
    supplierId: payload.supplierId || "mock",
    supplierSku: payload.supplierSku,
    supplierProductId: payload.supplierProductId,
    internalProductId: payload.internalProductId,
    internalSku: payload.internalSku,
    ean: payload.ean,
    gtin: payload.gtin,
    mpn: payload.mpn,
    brand: payload.brand,
    confidence: payload.confidence ?? 0.5,
  });
  return { mapping };
}

const HANDLERS = Object.freeze({
  [JOB_TYPES.PRODUCT_SYNC]: handleProductSync,
  [JOB_TYPES.PRICE_SYNC]: handlePriceSync,
  [JOB_TYPES.STOCK_SYNC]: handleStockSync,
  [JOB_TYPES.SUPPLIER_SYNC]: handleSupplierSync,
  [JOB_TYPES.CATEGORY_READINESS]: handleCategoryReadiness,
  [JOB_TYPES.AI_TASK]: handleAiTask,
  [JOB_TYPES.NOTIFICATION]: handleNotification,
  [JOB_TYPES.SYSTEM_HEALTH]: handleSystemHealth,
  [JOB_TYPES.PRODUCT_IMPORT]: handleProductImport,
  [JOB_TYPES.PRODUCT_VALIDATE]: handleProductValidate,
  [JOB_TYPES.PRODUCT_NORMALIZE]: handleProductNormalize,
  [JOB_TYPES.PRODUCT_MAPPING]: handleProductMapping,
  manual: async (payload) => ({ ok: true, payload }),
  part4_smoke_test: async () => ({ ok: true }),
});

function getHandler(jobType) {
  return HANDLERS[jobType] || null;
}

async function executeJob(job) {
  const handler = getHandler(job.jobType);
  if (!handler) {
    const err = new Error(`No handler for job type: ${job.jobType}`);
    err.failureKind = FAILURE_KIND.VALIDATION;
    throw err;
  }
  appendJobLog(job.id, `Executing ${job.jobType}`, { level: "INFO" });
  const result = await handler(job);
  appendJobLog(job.id, `Completed ${job.jobType}`, { level: "INFO", metadata: { success: true } });
  return result;
}

module.exports = { HANDLERS, getHandler, executeJob };
