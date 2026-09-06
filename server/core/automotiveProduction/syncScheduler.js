/**
 * Automotive Production Integration — sync scheduler (disabled by default).
 */
const { PRODUCTION_CONFIG } = require("./productionConfig");
const { ingestFromSupplier } = require("./productIngestionManager");
const { createSupplierConnector } = require("./supplierConnectorManager");
const { recordIntegrationAudit } = require("./integrationAudit");

const SYNC_JOBS = Object.freeze([
  "supplier_product_sync",
  "supplier_stock_sync",
  "supplier_price_sync",
  "tecdoc_sync",
  "fitment_sync",
  "translation_sync",
  "catalog_health",
]);

const _syncState = new Map();

function getSyncState(jobName) {
  if (!_syncState.has(jobName)) {
    _syncState.set(jobName, {
      lastSuccessfulSync: null,
      lastAttempt: null,
      recordsRead: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsRejected: 0,
      recordsReviewRequired: 0,
      errors: [],
    });
  }
  return _syncState.get(jobName);
}

function isSyncEnabled(jobName) {
  switch (jobName) {
    case "supplier_product_sync":
      return PRODUCTION_CONFIG.supplierSyncEnabled();
    case "supplier_stock_sync":
      return PRODUCTION_CONFIG.stockSyncEnabled();
    case "supplier_price_sync":
      return PRODUCTION_CONFIG.priceSyncEnabled();
    case "tecdoc_sync":
      return PRODUCTION_CONFIG.tecdocSyncEnabled();
    default:
      return false;
  }
}

async function runSyncJob(jobName, options = {}) {
  const state = getSyncState(jobName);
  state.lastAttempt = new Date().toISOString();

  if (!options.forceDryRun && !isSyncEnabled(jobName)) {
    return {
      ok: true,
      job: jobName,
      mode: "DISABLED",
      liveCalls: 0,
      message: `${jobName} disabled by config`,
    };
  }

  recordIntegrationAudit({ action: "SUPPLIER_SYNC_STARTED", metadata: { job: jobName } });

  let result = { recordsRead: 0, recordsCreated: 0, recordsUpdated: 0, recordsRejected: 0, recordsReviewRequired: 0 };

  if (jobName === "supplier_product_sync") {
    const ingestion = await ingestFromSupplier(options.supplierId || "supplier-mock", {
      mode: options.mode || "mock",
      updatedSince: options.updatedSince,
      cursor: options.cursor,
      page: options.page,
      limit: options.limit,
    });
    result.recordsRead = ingestion.productsFound || 0;
    result.recordsReviewRequired = (ingestion.results || []).filter((r) => r.state === "REVIEW_REQUIRED").length;
    result.recordsRejected = (ingestion.results || []).filter((r) => r.blocked).length;
  } else if (jobName === "supplier_stock_sync" || jobName === "supplier_price_sync") {
    const connector = createSupplierConnector(options.supplierId || "supplier-mock", { mode: "dry_run" });
    const fn = jobName === "supplier_stock_sync" ? connector.fetchStock : connector.fetchPrice;
    await fn("MOCK-001");
    result.recordsRead = 1;
  }

  state.recordsRead += result.recordsRead;
  state.recordsCreated += result.recordsCreated;
  state.recordsUpdated += result.recordsUpdated;
  state.recordsRejected += result.recordsRejected;
  state.recordsReviewRequired += result.recordsReviewRequired;
  state.lastSuccessfulSync = new Date().toISOString();

  recordIntegrationAudit({
    action: "SUPPLIER_SYNC_COMPLETED",
    metadata: { job: jobName, ...result, mode: options.forceDryRun ? "DRY_RUN" : "DISABLED" },
  });

  return {
    ok: true,
    job: jobName,
    mode: options.forceDryRun ? "DRY_RUN" : isSyncEnabled(jobName) ? "ENABLED" : "DISABLED",
    liveCalls: 0,
    supplierCalls: 0,
    ...result,
    syncState: { ...state },
  };
}

async function runDryRunSync(options = {}) {
  const summary = {
    mode: "DRY_RUN",
    supplierCalls: 0,
    liveCalls: 0,
    productsFound: 0,
    productsNormalized: 0,
    productsMapped: 0,
    productsValid: 0,
    productsRejected: 0,
    productsReviewRequired: 0,
    ordersCreated: 0,
    published: 0,
    jobs: [],
  };

  for (const job of ["supplier_product_sync", "supplier_stock_sync", "supplier_price_sync"]) {
    const jobResult = await runSyncJob(job, { ...options, forceDryRun: true });
    summary.jobs.push(jobResult);
    summary.productsFound += jobResult.recordsRead || 0;
    summary.productsReviewRequired += jobResult.recordsReviewRequired || 0;
    summary.productsRejected += jobResult.recordsRejected || 0;
  }

  const ingestion = await ingestFromSupplier(options.supplierId || "supplier-mock", { mode: "mock" });
  summary.productsFound = ingestion.productsFound || summary.productsFound;
  summary.productsNormalized = (ingestion.results || []).filter((r) => r.stages?.some((s) => s.stage === "normalization")).length;
  summary.productsMapped = (ingestion.results || []).filter((r) => !r.blocked).length;
  summary.productsValid = (ingestion.results || []).filter((r) => r.state !== "REVIEW_REQUIRED").length;

  return summary;
}

function getSyncStatus() {
  return {
    jobs: SYNC_JOBS.map((job) => ({
      job,
      enabled: isSyncEnabled(job),
      state: getSyncState(job),
    })),
    schedulerRunning: false,
    liveCalls: 0,
  };
}

module.exports = {
  SYNC_JOBS,
  getSyncState,
  isSyncEnabled,
  runSyncJob,
  runDryRunSync,
  getSyncStatus,
};
