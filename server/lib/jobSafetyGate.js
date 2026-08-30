/**
 * Part 16 — Background job safety gates.
 * Prevents accidental live supplier imports, supplier orders, and payment charges.
 */
const { JOB_TYPES } = require("../core/jobConstants");
const { isSalesEnabled } = require("./salesMode");
const goLiveApproval = require("./commerce/goLiveApproval");
const { canAttemptLiveFetch, isLiveImportEnabled } = require("./supplier/realSupplierConnector");
const { isTestOnlySupplier } = require("./supplier/supplierProductionGuard");

const SUPPLIER_JOB_TYPES = new Set([
  JOB_TYPES.SUPPLIER_SYNC,
  JOB_TYPES.PRODUCT_SYNC,
  JOB_TYPES.PRICE_SYNC,
  JOB_TYPES.STOCK_SYNC,
  JOB_TYPES.CATALOG_SYNC,
]);

const PAYMENT_SENSITIVE_TYPES = new Set([JOB_TYPES.NOTIFICATION]);

function assertJobSafe(job) {
  const type = job?.type || job?.jobType;
  const payload = job?.payload || {};
  const issues = [];

  if (SUPPLIER_JOB_TYPES.has(type)) {
    if (payload.live === true || payload.dryRun === false) {
      const liveCheck = canAttemptLiveFetch({
        supplierCode: payload.supplierCode || payload.supplierId,
        apiUrl: payload.apiUrl,
        dryRun: false,
        liveImportEnabled: isLiveImportEnabled(),
        _apiKeyRaw: payload.apiKey || process.env.REAL_SUPPLIER_API_KEY,
      });
      if (!liveCheck.ok) {
        issues.push({ gate: "supplier_live_import", reason: liveCheck.reason });
      }
    }

    const supplierId = payload.supplierCode || payload.supplierId || payload.supplier_id;
    if (supplierId && isTestOnlySupplier({ supplierId })) {
      issues.push({ gate: "supplier_test_only", reason: "test_only_supplier" });
    }
  }

  if (type === JOB_TYPES.SUPPLIER_SYNC && payload.submitOrder === true) {
    issues.push({ gate: "supplier_orders", reason: "supplier_orders_blocked" });
  }

  if (payload.charge === true || payload.capturePayment === true) {
    issues.push({ gate: "payment", reason: "payment_jobs_blocked" });
  }

  if (!isSalesEnabled()) {
    if (payload.enableSales === true || payload.activateSales === true) {
      issues.push({ gate: "sales", reason: "sales_disabled" });
    }
  }

  if (!goLiveApproval.PRODUCTION_SAFETY_LOCK && payload.forceGoLive === true) {
    issues.push({ gate: "go_live_lock", reason: "go_live_lock_inactive" });
  }

  return {
    ok: issues.length === 0,
    issues,
    jobType: type,
    dryRunDefault: payload.dryRun !== false,
    salesEnabled: isSalesEnabled(),
    goLiveLock: goLiveApproval.PRODUCTION_SAFETY_LOCK,
    supplierLiveImport: isLiveImportEnabled(),
  };
}

function wrapJobHandler(handler) {
  return async (job) => {
    const safety = assertJobSafe(job);
    if (!safety.ok) {
      const err = new Error(`Job blocked by safety gate: ${safety.issues.map((i) => i.reason).join(", ")}`);
      err.code = "job_safety_blocked";
      err.details = safety;
      throw err;
    }
    return handler(job);
  };
}

function getJobSafetyStatus() {
  return {
    supplierLiveImportEnabled: isLiveImportEnabled(),
    supplierOrdersBlocked: !isSalesEnabled() || process.env.BUZZARD_SUPPLIER_ORDERS_ENABLED !== "1",
    paymentJobsBlocked: !isSalesEnabled(),
    salesEnabled: isSalesEnabled(),
    goLiveLock: goLiveApproval.PRODUCTION_SAFETY_LOCK,
    queueBackend: "sqlite",
    queuePersistent: true,
    note: "Job queue uses SQLite (core_background_jobs). No Redis required. Memory-only queue not used.",
  };
}

module.exports = {
  assertJobSafe,
  wrapJobHandler,
  getJobSafetyStatus,
  SUPPLIER_JOB_TYPES,
};
