/**
 * Automotive Core Engine API + admin routes (RBAC, fail-closed).
 */
const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const automotiveCore = require("../core/automotiveCore");
const { searchProducts } = require("../lib/global/searchIntelligence");
const { loadSearchCatalog } = require("../lib/global/globalCatalogSearch");
const { runAutomotiveProductPipeline } = require("../lib/catalog/automotiveProductPipeline");
const legacyTaxonomy = require("../core/automotive/automotiveTaxonomy");

function attachAdmin(req, res) {
  const session = requireAuth(req, res);
  if (!session) return null;
  req.adminUser = session;
  return session;
}

function canPublish() {
  return (
    process.env.AUTOMOTIVE_PUBLISH_ENABLED === "1" &&
    process.env.BUZZARD_SALES_ENABLED === "1" &&
    automotiveCore.AUTOMOTIVE_CORE_SAFETY.publishEnabled === false
  );
}

module.exports = {
  register(app) {
    app.get("/api/automotive/core/manifest", (_req, res) => {
      res.json({ success: true, ...automotiveCore.getEngineManifest() });
    });

    app.get("/api/automotive/core/categories", (_req, res) => {
      res.json({
        success: true,
        engine: "automotive_core",
        categories: automotiveCore.listTopCategories(),
        stats: automotiveCore.getCategoryStats(),
        legacy: { subcategories: legacyTaxonomy.getSubcategories().length },
      });
    });

    app.get("/api/automotive/core/categories/:id", (req, res) => {
      const category = automotiveCore.getCategoryById(req.params.id);
      if (!category) return res.status(404).json({ success: false, errorKey: "AUTOMOTIVE_CATEGORY_INVALID" });
      res.json({ success: true, category });
    });

    app.get("/api/automotive/core/products", (req, res) => {
      const page = Math.max(1, Number(req.query.page || 1));
      const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize || 20)));
      const catalog = loadSearchCatalog().map((p) => automotiveCore.normalizeAutomotiveProduct(p));
      const start = (page - 1) * pageSize;
      res.json({
        success: true,
        page,
        pageSize,
        total: catalog.length,
        products: catalog.slice(start, start + pageSize),
        safety: automotiveCore.AUTOMOTIVE_CORE_SAFETY,
      });
    });

    app.get("/api/automotive/core/products/:id", (req, res) => {
      const catalog = loadSearchCatalog();
      const raw = catalog.find((p) => p.sku === req.params.id || p.id === req.params.id);
      if (!raw) return res.status(404).json({ success: false, errorKey: "product.notFound" });
      res.json({ success: true, product: automotiveCore.normalizeAutomotiveProduct(raw) });
    });

    app.get("/api/automotive/core/search", (req, res) => {
      const query = String(req.query.q || "").trim();
      const intent = automotiveCore.parseAutomotiveSearchIntent(query);
      const catalog = loadSearchCatalog();
      const result = searchProducts(catalog, query, {
        country: req.query.country || "DE",
        language: req.query.language || "de",
      });
      res.json({
        success: true,
        query,
        intent,
        ...result,
        safety: automotiveCore.AUTOMOTIVE_CORE_SAFETY,
      });
    });

    app.get("/api/automotive/core/vehicles", (req, res) => {
      const adapter = automotiveCore.createTecDocAdapter();
      adapter.getVehicle({ q: req.query.q, brand: req.query.brand }).then((data) => {
        res.json({ success: true, ...data });
      });
    });

    app.get("/api/automotive/core/fitment", (req, res) => {
      const catalog = loadSearchCatalog();
      const product = catalog.find((p) => p.sku === req.query.sku);
      if (!product) return res.status(404).json({ success: false, errorKey: "product.notFound" });
      const explanation = automotiveCore.explainFitmentMatch(product, {
        make: req.query.make,
        model: req.query.model,
        year: req.query.year ? Number(req.query.year) : null,
        engine: req.query.engine,
      });
      res.json({ success: true, fitment: explanation });
    });

    app.get("/api/automotive/core/suppliers", (_req, res) => {
      res.json({
        success: true,
        suppliers: automotiveCore.listSuppliers(),
        status: automotiveCore.getSupplierStatus(),
      });
    });

    app.get("/api/automotive/core/safety", (_req, res) => {
      res.json({ success: true, ...automotiveCore.assertAutomotiveCoreSafety() });
    });

    // Admin
    app.get("/api/admin/automotive/health", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      res.json({ success: true, health: automotiveCore.buildAutomotiveHealth() });
    });

    app.get("/api/admin/automotive/review", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      const catalog = loadSearchCatalog().slice(0, 50).map((p) => ({
        sku: p.sku,
        title: p.title,
        status: p.status || "DRAFT",
        validation: automotiveCore.validateIdentity(p),
      }));
      res.json({ success: true, reviewQueue: catalog, publishBlocked: true });
    });

    app.post("/api/admin/automotive/products/:sku/validate", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      const body = { ...(req.body || {}), sku: req.params.sku };
      const pipeline = runAutomotiveProductPipeline(body);
      const ingestion = automotiveCore.runIngestionPipeline(body);
      automotiveCore.recordAudit({
        user: req.adminUser?.userId,
        action: "validate",
        entity: "product",
        entityId: req.params.sku,
        after: { pipeline: pipeline.status, ingestion: ingestion.state },
      });
      res.json({ success: true, pipeline, ingestion });
    });

    app.post("/api/admin/automotive/products/:sku/approve", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "products.write")) return;
      automotiveCore.recordAudit({
        user: req.adminUser?.userId,
        action: "approve",
        entity: "product",
        entityId: req.params.sku,
        reason: req.body?.reason,
      });
      res.json({
        success: true,
        sku: req.params.sku,
        status: "APPROVED",
        published: false,
        note: "APPROVED != PUBLISHED",
      });
    });

    app.post("/api/admin/automotive/products/:sku/publish", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "products.write")) return;
      if (!canPublish() || !req.body?.manualPublish) {
        return res.status(403).json({
          success: false,
          ...automotiveCore.automotiveError(
            "AUTOMOTIVE_PUBLISH_BLOCKED",
            "Publish blocked — manualPublish, publishEnabled, and human approval required"
          ),
        });
      }
      res.status(403).json({
        success: false,
        ...automotiveCore.automotiveError("AUTOMOTIVE_PUBLISH_BLOCKED", "Publish remains blocked in diagnostic mode"),
      });
    });

    app.get("/api/admin/automotive/audit", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "audit.read")) return;
      res.json({ success: true, entries: automotiveCore.listAudit({ limit: Number(req.query.limit || 100) }) });
    });
  },
};
