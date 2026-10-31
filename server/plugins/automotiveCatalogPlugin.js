/**
 * Automotive catalog API + admin category management (RBAC, dry-run only).
 */
const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const taxonomy = require("../core/automotive/automotiveTaxonomy");
const taxonomyResolver = require("../lib/catalog/taxonomyResolver");
const categoryMapping = require("../lib/catalog/categoryMapping");
const productCategoryValidator = require("../lib/catalog/productCategoryValidator");
const { validateTaxonomyIntegrity, validateSafetyPolicy } = require("../core/automotive/automotiveValidation");
const { getFiltersForCategory } = require("../core/automotive/automotiveFilters");
const pimBridge = require("../lib/catalog/automotivePimBridge");

function attachAdmin(req, res) {
  const session = requireAuth(req, res);
  if (!session) return null;
  req.adminUser = session;
  return session;
}

module.exports = {
  register(app) {
    app.get("/api/automotive/taxonomy", (_req, res) => {
      res.json({
        success: true,
        ...taxonomy.getAutomotiveTaxonomy(),
        stats: taxonomy.loadTreeFromDisk().stats,
      });
    });

    app.get("/api/automotive/categories", (_req, res) => {
      res.json({ success: true, categories: taxonomy.getSubcategories() });
    });

    app.get("/api/automotive/categories/:id", (req, res) => {
      const resolved = taxonomyResolver.resolveCategory(req.params.id);
      if (!resolved) return res.status(404).json({ success: false, errorKey: "category.notFound" });
      res.json({ success: true, category: resolved });
    });

    app.get("/api/automotive/categories/:id/children", (req, res) => {
      res.json({ success: true, children: taxonomy.getChildren(req.params.id) });
    });

    app.get("/api/automotive/categories/:id/filters", (req, res) => {
      res.json({ success: true, filters: getFiltersForCategory(req.params.id) });
    });

    app.get("/api/automotive/categories/:id/breadcrumb", (req, res) => {
      res.json({ success: true, breadcrumb: taxonomyResolver.resolveBreadcrumb(req.params.id) });
    });

    app.get("/api/automotive/search", (req, res) => {
      res.json({ success: true, results: taxonomyResolver.searchCategories(req.query.q) });
    });

    app.get("/api/automotive/safety", (_req, res) => {
      res.json({ success: true, ...validateSafetyPolicy() });
    });

    app.get("/api/automotive/supplier-mappings", (_req, res) => {
      res.json({ success: true, mappings: categoryMapping.loadMappings() });
    });

    // Admin — category management (in-memory/json overrides, no live supplier)
    app.get("/api/admin/automotive/categories", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      res.json({ success: true, taxonomy: taxonomy.getAutomotiveTaxonomy() });
    });

    app.patch("/api/admin/automotive/categories/:id", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "products.write")) return;
      const category = taxonomy.getCategoryById(req.params.id);
      if (!category) return res.status(404).json({ success: false, errorKey: "category.notFound" });
      // Dry-run metadata update only — tree file regenerated via script; overrides stored separately
      res.json({
        success: true,
        message: "Category metadata update accepted (dry-run — regenerate taxonomy for persistent tree edits)",
        categoryId: req.params.id,
        patch: req.body,
      });
    });

    app.post("/api/admin/automotive/supplier-mappings", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "products.write")) return;
      const result = categoryMapping.upsertMapping(req.body || {});
      if (!result.success) return res.status(400).json({ success: false, errors: result.errors });
      res.status(201).json({ success: true, mapping: result.mapping });
    });

    app.post("/api/admin/automotive/products/validate", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      res.json({ success: true, validation: productCategoryValidator.validateCatalogReadiness(req.body || {}) });
    });

    app.post("/api/admin/automotive/products/pipeline", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      const pipeline = pimBridge.runAutomotiveProductPipeline(req.body || {}, {
        manualPublish: req.body?.manualPublish === true,
        requireGtin: req.body?.requireGtin !== false,
        requireMpn: req.body?.requireMpn !== false,
        requireImage: req.body?.requireImage !== false,
      });
      res.json({ success: true, ...pipeline });
    });

    app.post("/api/admin/automotive/products/:sku/approve", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "products.write")) return;
      const pipeline = pimBridge.runAutomotiveProductPipeline(
        { ...(req.body || {}), sku: req.params.sku, state: "APPROVED" },
        { requireImage: false }
      );
      if (!pipeline.ok) {
        return res.status(400).json({ success: false, errors: pipeline.errors, pipeline });
      }
      res.json({
        success: true,
        message: "Product marked APPROVED — manual publish still required",
        pipeline,
        publishAllowed: false,
      });
    });

    app.get("/api/admin/automotive/integrity", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      res.json({
        success: true,
        taxonomy: validateTaxonomyIntegrity(),
        safety: validateSafetyPolicy(),
        pim: pimBridge.getAutomotivePimStatus(),
      });
    });
  },
};
