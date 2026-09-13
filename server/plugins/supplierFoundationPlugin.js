/**
 * Supplier Integration Engine — production foundation admin API.
 * No secrets exposed; dry-run sync/order only.
 */
const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const { recordSupplierAction } = require("../lib/supplier/supplierAudit");
const { AUDIT_ACTIONS } = require("../core/operationsConstants");

let foundation = null;

function loadFoundation() {
  if (foundation) return foundation;
  try {
    foundation = require("../lib/supplierFoundation.bundle.cjs");
    foundation.bootstrapSupplierEnginePersistence?.();
    return foundation;
  } catch (err) {
    console.warn("Supplier foundation bundle unavailable:", err.message);
    return null;
  }
}

function attachAdmin(req, res) {
  const session = requireAuth(req, res);
  if (!session) return null;
  req.adminUser = {
    userId: session.userId,
    id: session.userId,
    email: session.email,
    role: session.role,
  };
  return session;
}

function audit(req, supplierId, action, metadata = {}) {
  recordSupplierAction(req, {
    supplierId,
    action,
    result: "success",
    dryRun: true,
    metadata,
  });
}

module.exports = {
  register(app) {
    if (process.env.BUZZARD_SUPPLIER_FOUNDATION === "0") {
      console.log("Supplier foundation API disabled (BUZZARD_SUPPLIER_FOUNDATION=0)");
      return;
    }

    const mod = loadFoundation();
    if (mod?.getSupplierPersistenceMode) {
      console.log(`Supplier foundation persistence: ${mod.getSupplierPersistenceMode()}`);
    }

    app.get("/api/admin/supplier-foundation/overview", async (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "suppliers.read")) return;
      const foundationMod = loadFoundation();
      if (!foundationMod) return res.status(503).json({ success: false, errorCode: "FOUNDATION_UNAVAILABLE" });
      const [rows, dashboard] = await Promise.all([
        foundationMod.getSupplierEngineAdminOverview(),
        foundationMod.getSupplierEngineDashboard(),
      ]);
      return res.json({ success: true, data: rows, dashboard, source: "supplier-foundation" });
    });

    app.get("/api/admin/supplier-foundation/:supplierId", async (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "suppliers.read")) return;
      const foundationMod = loadFoundation();
      if (!foundationMod) return res.status(503).json({ success: false, errorCode: "FOUNDATION_UNAVAILABLE" });
      const detail = await foundationMod.getSupplierEngineDetail(req.params.supplierId);
      if (!detail) return res.status(404).json({ success: false, errorCode: "UNKNOWN_SUPPLIER" });
      return res.json({ success: true, data: detail, source: "supplier-foundation" });
    });

    app.get("/api/admin/supplier-foundation/:supplierId/health", async (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "suppliers.read")) return;
      const foundationMod = loadFoundation();
      if (!foundationMod) return res.status(503).json({ success: false, errorCode: "FOUNDATION_UNAVAILABLE" });
      const detail = await foundationMod.getSupplierEngineDetail(req.params.supplierId);
      if (!detail) return res.status(404).json({ success: false, errorCode: "UNKNOWN_SUPPLIER" });
      return res.json({ success: true, data: detail.health, source: "supplier-foundation" });
    });

    app.post("/api/admin/supplier-foundation/:supplierId/sync", async (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "suppliers.write")) return;
      const foundationMod = loadFoundation();
      if (!foundationMod) return res.status(503).json({ success: false, errorCode: "FOUNDATION_UNAVAILABLE" });
      const sanitized = foundationMod.sanitizeClientSyncRequest(req.body || {});
      if (!sanitized.allowed) {
        return res.status(400).json({ success: false, errorCode: sanitized.reason });
      }
      const jobType = String(req.body?.jobType || "FULL");
      const integrationType = req.body?.integrationType;
      audit(req, req.params.supplierId, AUDIT_ACTIONS.PRODUCT_IMPORT, { jobType, manual: true });
      const result = await foundationMod.runSupplierSyncJob(req.params.supplierId, { jobType, integrationType });
      return res.json({ success: true, data: result, source: "supplier-foundation" });
    });

    app.post("/api/admin/supplier-foundation/:supplierId/enable", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "suppliers.write")) return;
      const foundationMod = loadFoundation();
      if (!foundationMod) return res.status(503).json({ success: false, errorCode: "FOUNDATION_UNAVAILABLE" });
      const updated = foundationMod.setSupplierEnabled(
        req.params.supplierId,
        true,
        req.adminUser?.email || req.adminUser?.userId
      );
      if (!updated) return res.status(404).json({ success: false, errorCode: "UNKNOWN_SUPPLIER" });
      audit(req, req.params.supplierId, AUDIT_ACTIONS.SUPPLIER_CONFIG, { enabled: true });
      return res.json({ success: true, data: updated, source: "supplier-foundation" });
    });

    app.post("/api/admin/supplier-foundation/:supplierId/disable", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "suppliers.write")) return;
      const foundationMod = loadFoundation();
      if (!foundationMod) return res.status(503).json({ success: false, errorCode: "FOUNDATION_UNAVAILABLE" });
      const updated = foundationMod.setSupplierEnabled(
        req.params.supplierId,
        false,
        req.adminUser?.email || req.adminUser?.userId
      );
      if (!updated) return res.status(404).json({ success: false, errorCode: "UNKNOWN_SUPPLIER" });
      audit(req, req.params.supplierId, AUDIT_ACTIONS.SUPPLIER_CONFIG, { enabled: false });
      return res.json({ success: true, data: updated, source: "supplier-foundation" });
    });

    app.post("/api/admin/supplier-foundation/:supplierId/order-dry-run", async (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "suppliers.read")) return;
      const foundationMod = loadFoundation();
      if (!foundationMod) return res.status(503).json({ success: false, errorCode: "FOUNDATION_UNAVAILABLE" });
      if (foundationMod.rejectClientCredentials(req.body || {})) {
        return res.status(400).json({ success: false, errorCode: "CREDENTIALS_NOT_ALLOWED" });
      }
      const validation = foundationMod.validateSupplierOrderPayload({
        supplierId: req.params.supplierId,
        ...req.body,
      });
      if (!validation.valid) {
        return res.status(400).json({ success: false, errors: validation.errors });
      }
      const result = await foundationMod.createSupplierOrder({
        supplierId: req.params.supplierId,
        ...req.body,
      });
      audit(req, req.params.supplierId, AUDIT_ACTIONS.SUPPLIER_ORDER_ATTEMPT, { dryRun: true });
      return res.json({ success: true, data: result, payload: validation.payload, source: "supplier-foundation" });
    });

    app.get("/api/admin/supplier-foundation/:supplierId/cursor", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "suppliers.read")) return;
      const foundationMod = loadFoundation();
      if (!foundationMod) return res.status(503).json({ success: false, errorCode: "FOUNDATION_UNAVAILABLE" });
      const syncMode = String(req.query.syncMode || "incremental");
      const cursor = foundationMod.getSyncCursorForAdmin(req.params.supplierId, syncMode);
      return res.json({ success: true, data: cursor, source: "supplier-foundation" });
    });

    app.post("/api/admin/supplier-foundation/:supplierId/cursor/reset", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "suppliers.write")) return;
      if (req.body?.confirm !== true) {
        return res.status(400).json({ success: false, errorCode: "CONFIRMATION_REQUIRED" });
      }
      const foundationMod = loadFoundation();
      if (!foundationMod) return res.status(503).json({ success: false, errorCode: "FOUNDATION_UNAVAILABLE" });
      const syncMode = String(req.body?.syncMode || "incremental");
      const result = foundationMod.resetSupplierCursorSafe(
        req.params.supplierId,
        syncMode,
        req.adminUser?.email || req.adminUser?.userId
      );
      audit(req, req.params.supplierId, AUDIT_ACTIONS.SUPPLIER_CONFIG, { cursorReset: true, syncMode });
      return res.json({ success: true, data: result, source: "supplier-foundation" });
    });
  },
};
