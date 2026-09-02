/**
 * Part 7 — Public storefront catalog API (PIM Core read bridge)
 */
const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const catalogReadService = require("../lib/storefront/catalogReadService");
const categoryCatalog = require("../lib/storefront/categoryCatalog");
const syncStatus = require("../lib/storefront/syncStatus");
const catalogCache = require("../lib/storefront/catalogCache");
const { isStorefrontBridgeEnabled } = require("../core/storefrontConstants");

function attachAdmin(req, res) {
  const session = requireAuth(req, res);
  if (!session) return null;
  req.adminUser = session;
  return session;
}

module.exports = {
  register(app) {
    if (!isStorefrontBridgeEnabled()) {
      console.log("Storefront bridge disabled (BUZZARD_PIM_STOREFRONT=0 or BUZZARD_DB_ENABLED=0)");
      return;
    }

    app.get("/api/catalog/products", (req, res) => {
      const preview = req.query?.preview === "1";
      res.json({
        success: true,
        ...catalogReadService.listProducts({ ...req.query, preview }),
      });
    });

    app.get("/api/catalog/products/slug/:slug", (req, res) => {
      const preview = req.query?.preview === "1";
      const product = catalogReadService.getProductById(req.params.slug, { preview });
      if (!product) return res.status(404).json({ success: false, errorKey: "product.notFound" });
      res.json({ success: true, product });
    });

    app.get("/api/catalog/products/:id", (req, res) => {
      if (req.params.id === "slug") return;
      const preview = req.query?.preview === "1";
      const product = catalogReadService.getProductById(req.params.id, { preview });
      if (!product) return res.status(404).json({ success: false, errorKey: "product.notFound" });
      res.json({ success: true, product });
    });

    app.get("/api/catalog/categories", (_req, res) => {
      res.json({ success: true, categories: categoryCatalog.listMainCategories() });
    });

    app.get("/api/catalog/categories/:id", (req, res) => {
      const includeChildren = req.query?.children === "1";
      const category = categoryCatalog.getCategoryById(req.params.id, { includeChildren });
      if (!category) return res.status(404).json({ success: false, errorKey: "category.notFound" });
      res.json({ success: true, category });
    });

    app.get("/api/catalog/categories/:id/children", (req, res) => {
      const children = categoryCatalog.getCategoryChildren(req.params.id);
      res.json({ success: true, children });
    });

    app.get("/api/catalog/brands", (_req, res) => {
      res.json({ success: true, brands: catalogReadService.listBrands() });
    });

    app.get("/api/catalog/search", (req, res) => {
      res.json({
        success: true,
        ...catalogReadService.searchProducts(req.query || {}),
      });
    });

    app.get("/api/catalog/categories/tree", (req, res) => {
      const storefrontCategoryService = require("../lib/storefront/storefrontCategoryService");
      const depth = Number(req.query?.depth) || 2;
      res.json({ success: true, categories: storefrontCategoryService.getCategoryTree({ depth }) });
    });

    app.get("/api/catalog/seo/sitemap-preview", (_req, res) => {
      const storefrontSeoService = require("../lib/storefront/storefrontSeoService");
      res.json({ success: true, entries: storefrontSeoService.buildSitemapEntries() });
    });

    app.get("/api/catalog/feed/google.xml", (req, res) => {
      const merchantFeedService = require("../lib/storefront/merchantFeedService");
      const xml = merchantFeedService.buildGoogleMerchantFeedXml(req.query || {});
      res.set("Content-Type", "application/xml; charset=utf-8");
      res.send(xml);
    });

    app.get("/api/catalog/readiness", (_req, res) => {
      const storefrontReadiness = require("../lib/storefront/storefrontReadiness");
      res.json({ success: true, ...storefrontReadiness.evaluateStorefrontReadiness() });
    });

    app.get("/api/catalog/health", (_req, res) => {
      res.json({ success: true, health: catalogReadService.getHealth() });
    });

    app.get("/api/storefront/health", (_req, res) => {
      res.json({ success: true, health: catalogReadService.getHealth() });
    });

    // Admin: preview as customer
    app.get("/api/admin/storefront/preview/products", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      res.json({
        success: true,
        preview: true,
        ...catalogReadService.listProducts({ ...req.query, preview: true }),
      });
    });

    app.get("/api/admin/storefront/preview/products/:id", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      const product = catalogReadService.getProductById(req.params.id, { preview: true });
      if (!product) return res.status(404).json({ success: false, errorKey: "product.notFound" });
      res.json({ success: true, preview: true, product });
    });

    app.post("/api/admin/storefront/sync", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "sync.run")) return;
      const dryRun = req.body?.dryRun !== false;
      const result = syncStatus.runSync({ dryRun });
      if (!dryRun) catalogCache.invalidate("catalog|");
      res.json({ success: true, ...result });
    });

    app.get("/api/admin/storefront/health", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.read")) return;
      res.json({ success: true, health: catalogReadService.getHealth() });
    });

    app.get("/api/admin/catalog/product-quality", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      const productQualityReadinessCenter = require("../lib/pim/productQualityReadinessCenter");
      const readiness = productQualityReadinessCenter.evaluateProductQualityReadiness();
      res.json({
        success: true,
        diagnosticOnly: true,
        autoActivate: false,
        ...readiness,
      });
    });

    app.post("/api/admin/catalog/product-quality/evaluate", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      const productQualityHardening = require("../lib/pim/productQualityHardening");
      const record = req.body?.record || req.body || {};
      const result = productQualityHardening.evaluateProductQualityHardening(record, {
        supplierCode: record.supplierCode || req.body?.supplierCode || "REAL-WHOLESALER-001",
        ...req.body?.options,
      });
      res.json({ success: true, result });
    });

    console.log("Storefront bridge plugin loaded (PIM → /api/catalog/*)");
  },
};
