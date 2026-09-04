/**
 * Part 23 — Supplier integration readiness API (validation/dry-run only).
 */
const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const adminSafetyGate = require("../lib/operations/adminSafetyGate");
const supplierRegistry = require("../lib/supplier/supplierRegistry");
const supplierReadinessCenter = require("../lib/supplier/supplierReadinessCenter");
const supplierHealth = require("../lib/supplier/supplierHealth");
const { evaluateCapabilityMatrix } = require("../lib/supplier/supplierCapabilityMatrix");
const supplierImportPipeline = require("../lib/supplier/supplierImportPipeline");
const { recordSupplierAction } = require("../lib/supplier/supplierAudit");
const { AUDIT_ACTIONS } = require("../core/operationsConstants");

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

module.exports = {
  register(app) {
    app.get("/api/admin/suppliers/readiness", async (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "suppliers.read")) return;
      const report = supplierReadinessCenter.evaluateSupplierIntegrationReadiness();
      res.json({ success: true, ...report });
    });

    app.get("/api/admin/suppliers/:id/health", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "suppliers.read")) return;
      const health = supplierHealth.evaluateSupplierHealth(req.params.id);
      if (!health.ok && health.error === "unknown_supplier") {
        return res.status(404).json({ success: false, error: health.error });
      }
      res.json({ success: true, health });
    });

    app.get("/api/admin/suppliers/:id/capabilities", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "suppliers.read")) return;
      const def = supplierRegistry.getSupplierDefinition(req.params.id);
      if (!def) return res.status(404).json({ success: false, error: "unknown_supplier" });
      const capabilities = evaluateCapabilityMatrix(def);
      res.json({ success: true, supplierId: def.id, ...capabilities });
    });

    app.post("/api/admin/suppliers/:id/validate", async (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "suppliers.read")) return;
      try {
        adminSafetyGate.requireAdminAction("import", { req, body: req.body, dryRun: true });
      } catch (err) {
        return res.status(403).json({ success: false, error: err.code, message: err.message });
      }
      const records = req.body?.records || (req.body?.raw ? [req.body.raw] : []);
      const result = await supplierImportPipeline.validateSupplierRecords(req.params.id, records, { req });
      recordSupplierAction(req, {
        supplierId: req.params.id,
        action: AUDIT_ACTIONS.PRODUCT_VALIDATE,
        result: "dry_run",
        dryRun: true,
        metadata: { recordCount: records.length },
      });
      res.json({ success: true, ...result });
    });

    app.post("/api/admin/suppliers/:id/dry-run", async (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "suppliers.read")) return;
      try {
        adminSafetyGate.requireAdminAction("import", { req, body: req.body, dryRun: true });
      } catch (err) {
        return res.status(403).json({ success: false, error: err.code, message: err.message });
      }
      const result = await supplierImportPipeline.runSupplierImportPipeline(req.params.id, {
        dryRun: true,
        limit: Number(req.body?.limit) || 10,
        records: req.body?.records,
        req,
        body: req.body,
        skipDbDuplicateCheck: true,
      });
      recordSupplierAction(req, {
        supplierId: req.params.id,
        action: AUDIT_ACTIONS.PRODUCT_IMPORT,
        result: "dry_run",
        dryRun: true,
        metadata: { stages: result.stages?.length, summary: result.summary },
      });
      res.json({ success: true, ...result });
    });
  },
};
