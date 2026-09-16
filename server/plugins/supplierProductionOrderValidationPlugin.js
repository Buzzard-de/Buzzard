/**
 * #341 — Inter Cars createOrder Production Capability Validation admin API.
 * No real supplier order dispatch in default mode.
 */
const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");

let validation = null;

function loadValidation() {
  if (validation) return validation;
  try {
    validation = require("../lib/supplierProductionOrderValidation.bundle.cjs");
    validation.hydrateValidationFromPersistence?.();
    return validation;
  } catch (err) {
    console.warn("Supplier production order validation bundle unavailable:", err.message);
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
    if (process.env.BUZZARD_SUPPLIER_PRODUCTION_ORDER_VALIDATION === "0") {
      console.log("Supplier production order validation API disabled (BUZZARD_SUPPLIER_PRODUCTION_ORDER_VALIDATION=0)");
      return;
    }

    app.get("/api/admin/supplier-production-order-validation/dashboard", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-production-order-validation.read")) return;
      const mod = loadValidation();
      if (!mod) return res.status(503).json({ success: false, errorCode: "VALIDATION_UNAVAILABLE" });
      return res.json({ success: true, data: mod.getCreateOrderValidationDashboard(), source: "supplier-production-order-validation" });
    });

    app.get("/api/admin/supplier-production-order-validation/records", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-production-order-validation.read")) return;
      const mod = loadValidation();
      if (!mod) return res.status(503).json({ success: false, errorCode: "VALIDATION_UNAVAILABLE" });
      const rows = mod.listCreateOrderValidationRows({
        supplierId: req.query.supplierId ? String(req.query.supplierId) : undefined,
        status: req.query.status ? String(req.query.status) : undefined,
      });
      return res.json({ success: true, data: rows, source: "supplier-production-order-validation" });
    });

    app.get("/api/admin/supplier-production-order-validation/records/:validationId", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-production-order-validation.read")) return;
      const mod = loadValidation();
      if (!mod) return res.status(503).json({ success: false, errorCode: "VALIDATION_UNAVAILABLE" });
      const detail = mod.getCreateOrderValidationDetail(req.params.validationId);
      if (!detail) return res.status(404).json({ success: false, errorCode: "VALIDATION_NOT_FOUND" });
      return res.json({ success: true, data: detail, source: "supplier-production-order-validation" });
    });

    app.post("/api/admin/supplier-production-order-validation/run", async (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-production-order-validation.run")) return;
      const mod = loadValidation();
      if (!mod) return res.status(503).json({ success: false, errorCode: "VALIDATION_UNAVAILABLE" });
      try {
        const result = await mod.runCreateOrderProductionValidation({
          supplierId: req.body?.supplierId,
          market: req.body?.market || "DE",
          channel: req.body?.channel || "DIRECT",
          environment: req.body?.environment,
          orderId: req.body?.orderId,
          requester: req.adminUser.email,
          approver: req.body?.approver,
          failureInjection: req.body?.failureInjection,
          idempotencyKey: req.body?.idempotencyKey,
          humanConfirmation: Boolean(req.body?.humanConfirmation),
          confirmationNonce: req.body?.confirmationNonce,
        });
        const safety = mod.getCreateOrderValidationSafetyCounters();
        return res.json({ success: true, data: result, safety, source: "supplier-production-order-validation" });
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
