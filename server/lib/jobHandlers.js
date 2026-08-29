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

const HANDLERS = Object.freeze({
  [JOB_TYPES.PRODUCT_SYNC]: handleProductSync,
  [JOB_TYPES.PRICE_SYNC]: handlePriceSync,
  [JOB_TYPES.STOCK_SYNC]: handleStockSync,
  [JOB_TYPES.SUPPLIER_SYNC]: handleSupplierSync,
  [JOB_TYPES.CATEGORY_READINESS]: handleCategoryReadiness,
  [JOB_TYPES.AI_TASK]: handleAiTask,
  [JOB_TYPES.NOTIFICATION]: handleNotification,
  [JOB_TYPES.SYSTEM_HEALTH]: handleSystemHealth,
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
