/**
 * Health + Pusat read-only dispatch. Default Pusat OFF.
 */
const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const productSot = require("../lib/productSot");
const { evaluateSalesGate } = require("../lib/salesSafetyGate");
const pusat = require("../lib/pusat/runtime");
const { list: listExceptions } = require("../lib/exceptionBus");
const { sourceMatrix } = require("../lib/productIdentitySources");
const { validateMigration } = require("../lib/productSotValidator");
const { listReviewQueue } = require("../lib/productCollisionDetector");
const { createSourceOfTruthService } = require("../lib/sot/sourceOfTruthService");
const { createExternalIntegrationVerification } = require("../lib/externalIntegrationVerification");
const { createGoLiveGate } = require("../lib/goLiveGate");
const { createGoLiveActivation } = require("../lib/goLiveActivation");
const { createProductionGoLiveClosure } = require("../lib/productionGoLiveClosure");

const sotService = createSourceOfTruthService();
const externalVerification = createExternalIntegrationVerification();
const goLiveGate = createGoLiveGate();
const goLiveActivation = createGoLiveActivation({ mutateEnv: false, productionSafetyLock: true });
const goLiveClosure = createProductionGoLiveClosure();

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

    app.get("/api/health/sot", (_req, res) => {
      res.json(sotService.publicHealth());
    });

    app.get("/api/health/external-integrations", (_req, res) => {
      res.json(externalVerification.publicHealth());
    });

    app.get("/api/health/go-live", (_req, res) => {
      res.json(goLiveGate.publicHealth());
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

    app.get("/api/health/product-sot/sources", (_req, res) => {
      res.json({ success: true, sources: sourceMatrix(), productSot: productSot.getStatus() });
    });

    app.get("/api/health/product-sot/validator", (_req, res) => {
      res.json({ success: true, validator: validateMigration() });
    });

    app.get("/api/admin/product-sot/review-queue", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      res.json({ success: true, queue: listReviewQueue({ status: req.query.status || "PENDING" }) });
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

    app.get("/api/admin/system/sot", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.read")) return;
      res.json(sotService.adminStatus());
    });

    app.get("/api/admin/system/external-integrations", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.read")) return;
      res.json(externalVerification.adminReport());
    });

    app.get("/api/admin/system/go-live", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.read")) return;
      res.json(goLiveGate.adminReport());
    });

    app.get("/api/admin/system/go-live/closure", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.read")) return;
      res.json(goLiveClosure.evaluate());
    });

    app.get("/api/admin/system/go-live/checks", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.read")) return;
      const report = goLiveGate.evaluateGoLive();
      res.json({ checks: report.checks, correlationId: report.correlationId });
    });

    app.post("/api/admin/system/go-live/activate", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.configure")) return;
      if (req.query.force === "true" || req.query.override === "true") {
        return res.status(400).json({ ok: false, error: "BYPASS_FORBIDDEN" });
      }
      const result = goLiveActivation.activateProduction({
        approvalId: req.body?.approvalId,
        correlationId: req.correlationId || req.body?.correlationId,
      });
      res.status(result.ok ? 200 : 409).json({ success: result.ok, salesEnabled: false, ...result });
    });

    app.post("/api/admin/system/go-live/deactivate", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.configure")) return;
      const result = goLiveActivation.deactivateProduction({
        reason: req.body?.reason,
        actor: req.adminUser?.email || req.adminUser?.userId,
        correlationId: req.correlationId || req.body?.correlationId,
      });
      res.json({ success: true, salesEnabled: false, ...result });
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
