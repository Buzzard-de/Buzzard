/**
 * Automotive Production Integration Layer — admin API routes.
 */
const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const production = require("../core/automotiveProduction");

function attachAdmin(req, res) {
  const session = requireAuth(req, res);
  if (!session) return null;
  req.adminUser = session;
  return session;
}

module.exports = {
  register(app) {
    app.get("/api/admin/automotive/integrations", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      res.json({
        success: true,
        manifest: production.getProductionManifest(),
        safety: production.assertProductionSafety(),
      });
    });

    app.get("/api/admin/automotive/suppliers", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      res.json({
        success: true,
        suppliers: production.listRegisteredSuppliers(),
        coreSuppliers: production.listSuppliers(),
      });
    });

    app.get("/api/admin/automotive/tecdoc/status", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      res.json({
        success: true,
        tecdoc: production.getTecDocConnectorStatus(),
        core: production.getTecDocStatus(),
      });
    });

    app.get("/api/admin/automotive/sync/status", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      res.json({ success: true, sync: production.getSyncStatus() });
    });

    app.get("/api/admin/automotive/health", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      res.json({
        success: true,
        health: production.buildIntegrationHealth(),
        core: production.buildAutomotiveHealth(),
      });
    });

    app.post("/api/admin/automotive/sync/dry-run", async (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "products.write")) return;
      const result = await production.runDryRunSync(req.body || {});
      production.recordIntegrationAudit({
        actor: req.adminUser?.userId,
        action: "SUPPLIER_SYNC_COMPLETED",
        metadata: { mode: "DRY_RUN", ...result },
      });
      res.json({ success: true, ...result });
    });

    app.post("/api/admin/automotive/products/:sku/validate", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      const body = { ...(req.body || {}), sku: req.params.sku };
      const pipeline = production.runProductionIngestionPipeline(body, req.body?.context || {});
      production.recordIntegrationAudit({
        actor: req.adminUser?.userId,
        action: "PRODUCT_VALIDATED",
        entityId: req.params.sku,
        metadata: { state: pipeline.state },
      });
      res.json({ success: true, pipeline });
    });

    app.post("/api/admin/automotive/products/:sku/approve", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "products.write")) return;
      const result = production.approveProduct(req.params.sku, req.adminUser?.userId);
      res.json({ success: true, ...result });
    });

    app.post("/api/admin/automotive/products/:sku/publish", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "products.write")) return;
      const result = production.publishProduct(req.params.sku, {
        manualPublish: Boolean(req.body?.manualPublish),
        actor: req.adminUser?.userId,
      });
      if (!result.ok) {
        return res.status(result.httpStatus || 403).json(result);
      }
      res.json(result);
    });
  },
};
