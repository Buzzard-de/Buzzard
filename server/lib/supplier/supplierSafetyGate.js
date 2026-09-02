/**
 * Part 23 — Supplier operation safety gate (dry-run / blocked by default).
 */
const adminSafetyGate = require("../operations/adminSafetyGate");
const { checkProductionSafety } = require("../pim/productionSafetyGate");
const { canAttemptLiveFetch, areCredentialsConfigured } = require("./realSupplierConnector");
const { createSupplierError } = require("./supplierErrors");
const { SUPPLIER_ERROR_CODE } = require("../../core/supplierIntegrationConstants");

function isSupplierOrdersBlocked() {
  const salesEnabled = process.env.BUZZARD_SALES_ENABLED === "1";
  const supplierOrdersEnabled = process.env.BUZZARD_SUPPLIER_ORDERS_ENABLED === "1";
  return !salesEnabled || !supplierOrdersEnabled;
}

function assertSupplierOperation(operation, { req, body = {}, dryRun = true, supplierId = null } = {}) {
  const issues = [];
  const normalized = String(operation || "").toLowerCase();

  try {
    adminSafetyGate.assertAdminAction(normalized.includes("order") ? "supplier_order" : "import", {
      req,
      body: { ...body, supplierId },
      dryRun,
    });
  } catch (err) {
    issues.push({ gate: "admin_safety", reason: err.message, code: err.code });
  }

  const safety = checkProductionSafety();
  if (!safety.ok) {
    issues.push({ gate: "production_safety", reason: safety.issues.join("; ") });
  }

  if (normalized.includes("live") && !dryRun) {
    const liveCheck = canAttemptLiveFetch({
      supplierCode: supplierId || body.supplierId,
      dryRun: false,
      liveImportEnabled: process.env.REAL_SUPPLIER_LIVE_IMPORT === "1",
      apiUrl: body.apiUrl,
      _apiKeyRaw: body.apiKey,
    });
    if (!liveCheck.ok) {
      issues.push({ gate: "live_import", reason: liveCheck.reason });
    }
  }

  if (normalized.includes("order") || body.submitOrder) {
    if (isSupplierOrdersBlocked()) {
      issues.push({ gate: "supplier_orders", reason: "supplierOrdersBlocked=true" });
    }
  }

  if (!dryRun && normalized.includes("import")) {
    issues.push({ gate: "dry_run", reason: "Live import blocked — dry-run only in Part 23" });
  }

  const ok = issues.length === 0;
  return { ok, operation: normalized, issues, dryRun, supplierOrdersBlocked: isSupplierOrdersBlocked() };
}

function requireSupplierOperation(operation, context = {}) {
  const result = assertSupplierOperation(operation, context);
  if (!result.ok) {
    const orderBlocked = result.issues.some((i) => i.gate === "supplier_orders");
    const code = orderBlocked
      ? SUPPLIER_ERROR_CODE.SUPPLIER_ORDER_BLOCKED
      : SUPPLIER_ERROR_CODE.LIVE_IMPORT_BLOCKED;
    const payload = createSupplierError(code, {
      message: result.issues.map((i) => i.reason).join("; "),
      details: result,
      supplierId: context.supplierId,
    });
    const err = new Error(payload.message);
    err.code = payload.code;
    err.details = payload.details;
    err.supplierError = payload;
    throw err;
  }
  return result;
}

function getSafetySnapshot(supplierId) {
  const safety = checkProductionSafety();
  const credentials = areCredentialsConfigured({
    supplierCode: supplierId,
    apiUrl: process.env.REAL_SUPPLIER_API_URL,
    _apiKeyRaw: process.env.REAL_SUPPLIER_API_KEY || process.env.SUPPLIER_API_KEY,
  });

  return {
    productionSafetyLock: safety.goLiveLock,
    salesEnabled: safety.salesEnabled,
    supplierOrdersBlocked: isSupplierOrdersBlocked(),
    liveImportEnabled: process.env.REAL_SUPPLIER_LIVE_IMPORT === "1",
    dryRunDefault: process.env.REAL_SUPPLIER_DRY_RUN !== "0",
    credentialsConfigured: credentials,
    canConnectLive: false,
  };
}

module.exports = {
  assertSupplierOperation,
  requireSupplierOperation,
  isSupplierOrdersBlocked,
  getSafetySnapshot,
};
