/**
 * Part 17 — Admin safety gate for critical operations.
 * Normal API calls must never activate sales or bypass go-live lock.
 */
const goLiveApproval = require("../commerce/goLiveApproval");
const { getEffectiveFlags } = require("../commerce/commerceFeatureFlags");
const { assertProductionSafety } = require("../pim/productionSafetyGate");
const operationsAudit = require("./operationsAudit");
const { AUDIT_ACTIONS } = require("../../core/operationsConstants");
const { isTestOnlySupplier } = require("../supplier/supplierProductionGuard");
const { isLiveImportEnabled } = require("../supplier/realSupplierConnector");

const CRITICAL_ACTIONS = new Set([
  "import",
  "import_live",
  "publish",
  "supplier_config",
  "payment_config",
  "sales_config",
  "go_live",
  "supplier_order",
  "restore",
]);

function assertAdminAction(action, { req, body = {}, dryRun = true } = {}) {
  const issues = [];
  const normalized = String(action || "").toLowerCase();

  if (!CRITICAL_ACTIONS.has(normalized) && !normalized.startsWith("pim.")) {
    return { ok: true, action: normalized };
  }

  try {
    assertProductionSafety();
  } catch (err) {
    issues.push({ gate: "production_safety", reason: err.message });
  }

  if (normalized.includes("sales") || body.enableSales || body.BUZZARD_SALES_ENABLED === "1") {
    issues.push({ gate: "sales", reason: "Sales activation requires explicit go-live approval" });
    operationsAudit.recordFromRequest(req, {
      action: AUDIT_ACTIONS.SALES_ACTIVATION_ATTEMPT,
      resource: "sales",
      result: "blocked",
      reason: "admin_safety_gate",
    });
  }

  if (normalized.includes("import_live") || (normalized.includes("import") && body.live === true && dryRun === false)) {
    if (isLiveImportEnabled()) {
      issues.push({ gate: "supplier_live_import", reason: "Live import blocked without credentials validation" });
    }
  }

  if (normalized.includes("supplier_order") || body.submitOrder === true) {
    issues.push({ gate: "supplier_orders", reason: "Supplier orders blocked while SALES=0" });
    operationsAudit.recordFromRequest(req, {
      action: AUDIT_ACTIONS.SUPPLIER_ORDER_ATTEMPT,
      resource: "supplier_order",
      result: "blocked",
      reason: "sales_disabled",
    });
  }

  if (body.supplierId && isTestOnlySupplier({ supplierId: body.supplierId })) {
    issues.push({ gate: "supplier_test_only", reason: `${body.supplierId} is TEST ONLY` });
  }

  if (normalized.includes("payment") && (body.enablePayments || body.BUZZARD_PAYMENT_ENABLED === "1")) {
    const flags = getEffectiveFlags();
    if (!flags.salesEnabled) {
      issues.push({ gate: "payments", reason: "Payments cannot be enabled while SALES=0" });
    }
  }

  if (normalized.includes("go_live") && !goLiveApproval.PRODUCTION_SAFETY_LOCK) {
    issues.push({ gate: "go_live_lock", reason: "Go-live lock must remain active in Part 17" });
  }

  const ok = issues.length === 0;
  if (!ok && req) {
    operationsAudit.recordFromRequest(req, {
      action: AUDIT_ACTIONS.SECURITY_GATE,
      resource: normalized,
      result: "blocked",
      reason: issues.map((i) => i.reason).join("; "),
      metadata: { issues },
    });
  }

  return { ok, action: normalized, issues, goLiveLock: goLiveApproval.PRODUCTION_SAFETY_LOCK };
}

function requireAdminAction(action, context = {}) {
  const result = assertAdminAction(action, context);
  if (!result.ok) {
    const err = new Error(`Admin action blocked: ${result.issues.map((i) => i.reason).join("; ")}`);
    err.code = "admin_action_blocked";
    err.details = result;
    throw err;
  }
  return result;
}

module.exports = {
  assertAdminAction,
  requireAdminAction,
  CRITICAL_ACTIONS,
};
