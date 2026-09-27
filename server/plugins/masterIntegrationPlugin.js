/**
 * Health + Pusat read-only dispatch. Default Pusat OFF.
 */
const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const productSot = require("../lib/productSot");
const { evaluateSalesGate } = require("../lib/salesSafetyGate");
const pusat = require("../lib/pusat/runtime");
const { list: listExceptions } = require("../lib/exceptionBus");

function attachAdmin(req, res) {
  const session = requireAuth(req, res);
  if (!session) return null;
  req.adminUser = session;
  return session;
}

module.exports = {
  register(app) {
    app.get("/api/health/product-sot", (_req, res) => {
      res.json({ success: true, productSot: productSot.getStatus(), salesGate: evaluateSalesGate() });
    });

    app.get("/api/health/sales-gate", (_req, res) => {
      res.json({ success: true, salesGate: evaluateSalesGate() });
    });

    app.get("/api/health/pusat", (_req, res) => {
      res.json({ success: true, pusat: pusat.health() });
    });

    app.get("/api/health/liveness", (_req, res) => {
      res.json({ success: true, status: "ok" });
    });

    app.get("/api/health/readiness", (_req, res) => {
      const sot = productSot.getStatus();
      const gate = evaluateSalesGate();
      res.json({
        success: true,
        ready: true,
        catalog: true,
        sales: gate.allowed,
        productSot: sot.status,
        pusat: pusat.health().enabled,
      });
    });

    app.get("/api/admin/product-sot/identity", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      res.json({
        success: true,
        productSot: productSot.getStatus(),
        mappings: productSot.listIdentityMaps({
          sourceSystem: req.query.source,
          limit: Number(req.query.limit) || 50,
        }),
      });
    });

    app.get("/api/admin/exceptions", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      res.json({ success: true, exceptions: listExceptions({ status: req.query.status || "OPEN" }) });
    });

    app.post("/api/admin/pusat/dispatch", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      const body = req.body || {};
      const result = pusat.executeReadOnly(body.action, body.payload || {}, {
        actorId: req.adminUser?.email || req.adminUser?.userId,
        correlationId: req.correlationId || body.correlationId,
      });
      res.status(result.ok ? 200 : result.code === "PUSAT_DISABLED" ? 503 : 400).json({ success: result.ok, ...result });
    });
  },
};
