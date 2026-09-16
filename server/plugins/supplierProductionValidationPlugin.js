/**
 * #339 — Inter Cars Production Capability & Credential Validation Gate admin API.
 * Read-only validation — no real supplier order dispatch.
 */
const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");

let validation = null;

function loadValidation() {
  if (validation) return validation;
  try {
    validation = require("../lib/supplierProductionValidation.bundle.cjs");
    validation.hydrateValidationFromPersistence?.();
    return validation;
  } catch (err) {
    console.warn("Supplier production validation bundle unavailable:", err.message);
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

module.exports = {
  register(app) {
    if (process.env.BUZZARD_SUPPLIER_PRODUCTION_VALIDATION === "0") {
      console.log("Supplier production validation API disabled (BUZZARD_SUPPLIER_PRODUCTION_VALIDATION=0)");
      return;
    }

    app.get("/api/admin/supplier-production-validation/dashboard", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-production-validation.read")) return;
      const mod = loadValidation();
      if (!mod) return res.status(503).json({ success: false, errorCode: "VALIDATION_UNAVAILABLE" });
      return res.json({
        success: true,
        data: mod.getProductionValidationDashboard(),
        source: "supplier-production-validation",
      });
    });

    app.get("/api/admin/supplier-production-validation/records", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-production-validation.read")) return;
      const mod = loadValidation();
      if (!mod) return res.status(503).json({ success: false, errorCode: "VALIDATION_UNAVAILABLE" });
      const rows = mod.listProductionValidationRows({
        supplierId: req.query.supplierId ? String(req.query.supplierId) : undefined,
        market: req.query.market ? String(req.query.market) : undefined,
        channel: req.query.channel ? String(req.query.channel) : undefined,
        status: req.query.status ? String(req.query.status) : undefined,
      });
      return res.json({ success: true, data: rows, source: "supplier-production-validation" });
    });

    app.get("/api/admin/supplier-production-validation/records/:validationId", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-production-validation.read")) return;
      const mod = loadValidation();
      if (!mod) return res.status(503).json({ success: false, errorCode: "VALIDATION_UNAVAILABLE" });
      const detail = mod.getProductionValidationDetail(req.params.validationId);
      if (!detail) return res.status(404).json({ success: false, errorCode: "VALIDATION_NOT_FOUND" });
      return res.json({ success: true, data: detail, source: "supplier-production-validation" });
    });

    app.post("/api/admin/supplier-production-validation/run", async (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-production-validation.run")) return;
      const mod = loadValidation();
      if (!mod) return res.status(503).json({ success: false, errorCode: "VALIDATION_UNAVAILABLE" });
      try {
        const result = await mod.runProductionCapabilityValidation({
          supplierId: req.body?.supplierId,
          market: req.body?.market || "DE",
          channel: req.body?.channel || "DIRECT",
          environment: req.body?.environment,
          requester: req.adminUser.email,
          allowLiveRead: Boolean(req.body?.allowLiveRead),
          failureInjection: req.body?.failureInjection,
          idempotencyKey: req.body?.idempotencyKey,
        });
        const safety = mod.getProductionValidationSafetyCounters();
        return res.json({ success: true, data: result, safety, source: "supplier-production-validation" });
      } catch (err) {
        return res.status(500).json({
          success: false,
          errorCode: "VALIDATION_RUN_FAILED",
          message: err instanceof Error ? err.message : "Validation failed",
        });
      }
    });
  },
};
