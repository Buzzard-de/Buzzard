const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const { logAuditFromRequest } = require("../lib/coreAudit");
const productCore = require("../lib/pim/productCore");
const brandService = require("../lib/pim/brandService");
const supplierMapping = require("../lib/pim/supplierMapping");
const importPipeline = require("../lib/pim/importPipeline");
const productValidation = require("../lib/pim/productValidation");
const categoryEngine = require("../lib/pim/categoryEngine");
const attributeSchema = require("../lib/pim/attributeSchema");
const variantService = require("../lib/pim/variantService");
const mediaService = require("../lib/pim/mediaService");
const seoService = require("../lib/pim/seoService");
const productSearch = require("../lib/pim/productSearch");
const productAudit = require("../lib/pim/productAudit");
const qualityScore = require("../lib/pim/qualityScore");
const bulkOperations = require("../lib/pim/bulkOperations");
const productAiFoundation = require("../lib/pim/productAiFoundation");
const jobQueue = require("../lib/jobQueue");
const { JOB_TYPES_PIM } = require("../core/productConstants");

function attachAdmin(req, res) {
  const session = requireAuth(req, res);
  if (!session) return null;
  req.adminUser = {
    userId: session.userId,
    id: session.userId,
    email: session.email,
    name: session.name,
    role: session.role,
  };
  return session;
}

function requirePerm(req, res, permission) {
  return requirePermission(req, res, permission);
}

module.exports = {
  register(app) {
    app.get("/api/admin/pim-core/products", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "products.read")) return;
      res.json({
        success: true,
        products: productCore.listProducts({
          status: req.query.status,
          category: req.query.category,
          q: req.query.q,
          limit: Number(req.query.limit) || 50,
        }),
      });
    });

    app.get("/api/admin/pim-core/products/:id", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "products.read")) return;
      const product = productCore.getProduct(req.params.id);
      if (!product) return res.status(404).json({ success: false, errorKey: "product.notFound" });
      res.json({ success: true, product, audit: productAudit.listAudit(product.id, 20) });
    });

    app.post("/api/admin/pim-core/products", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "products.write")) return;
      try {
        const product = productCore.createProduct(req.body || {}, {
          source: "ADMIN",
          actorId: req.adminUser.email,
        });
        logAuditFromRequest(req, { action: "pim.product.create", entityType: "product", entityId: product.id });
        res.status(201).json({ success: true, product });
      } catch (err) {
        res.status(400).json({ success: false, message: err.message });
      }
    });

    app.patch("/api/admin/pim-core/products/:id", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "products.write")) return;
      try {
        const product = productCore.updateProduct(req.params.id, req.body || {}, {
          source: "ADMIN",
          actorId: req.adminUser.email,
        });
        res.json({ success: true, product });
      } catch (err) {
        res.status(400).json({ success: false, message: err.message });
      }
    });

    app.post("/api/admin/pim-core/products/:id/validate", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "products.read")) return;
      const product = productCore.getProduct(req.params.id);
      if (!product) return res.status(404).json({ success: false });
      res.json({ success: true, validation: productValidation.validateProduct(product) });
    });

    app.get("/api/admin/pim-core/brands", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "products.read")) return;
      res.json({ success: true, brands: brandService.listBrands() });
    });

    app.post("/api/admin/pim-core/brands", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "products.write")) return;
      try {
        const brand = brandService.createBrand(req.body || {});
        res.status(201).json({ success: true, brand });
      } catch (err) {
        res.status(400).json({ success: false, message: err.message });
      }
    });

    app.get("/api/admin/pim-core/supplier-mappings", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "suppliers.read")) return;
      res.json({
        success: true,
        mappings: supplierMapping.listMappings({
          supplierId: req.query.supplierId,
          internalProductId: req.query.productId,
        }),
      });
    });

    app.post("/api/admin/pim-core/supplier-mappings", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "suppliers.write")) return;
      const mapping = supplierMapping.createMapping(req.body || {});
      res.status(201).json({ success: true, mapping });
    });

    app.get("/api/admin/pim-core/categories/:categoryId/schema", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "categories.read")) return;
      res.json({ success: true, schema: attributeSchema.getSchema(req.params.categoryId) });
    });

    app.get("/api/admin/pim-core/categories/:categoryId/mapping", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "categories.read")) return;
      res.json({ success: true, mapping: categoryEngine.getMapping(req.params.categoryId) });
    });

    app.post("/api/admin/pim-core/import", async (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "imports.run")) return;
      const dryRun = req.body?.dryRun !== false;
      const result = await importPipeline.runPipeline(req.body?.raw || req.body || {}, {
        dryRun,
        supplierId: req.body?.supplierId,
        actorId: req.adminUser.email,
      });
      if (!dryRun) {
        logAuditFromRequest(req, { action: "pim.import", entityType: "import", entityId: result.importJobId });
      }
      res.json({ success: true, ...result });
    });

    app.post("/api/admin/pim-core/import/enqueue", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "imports.run")) return;
      const job = jobQueue.enqueueJob({
        jobType: JOB_TYPES_PIM.PRODUCT_IMPORT,
        payload: { raw: req.body?.raw || req.body, dryRun: req.body?.dryRun !== false },
        createdBy: req.adminUser.email,
      });
      res.status(201).json({ success: true, job });
    });

    app.get("/api/admin/pim-core/search", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "products.read")) return;
      res.json({
        success: true,
        results: productSearch.search({
          q: req.query.q,
          category: req.query.category,
          brandId: req.query.brandId,
        }),
      });
    });

    app.post("/api/admin/pim-core/bulk", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "products.write")) return;
      const { action, ids } = req.body || {};
      if (!Array.isArray(ids) || !ids.length) {
        return res.status(400).json({ success: false, message: "ids required" });
      }
      let results;
      const actorId = req.adminUser.email;
      switch (action) {
        case "activate":
          results = bulkOperations.bulkActivate(ids, actorId);
          break;
        case "hide":
          results = bulkOperations.bulkHide(ids, actorId);
          break;
        case "archive":
          results = bulkOperations.bulkArchive(ids, actorId);
          break;
        case "category":
          results = bulkOperations.bulkCategoryChange(ids, req.body.categoryId, actorId);
          break;
        case "brand":
          results = bulkOperations.bulkBrandMapping(ids, req.body.brandId, actorId);
          break;
        default:
          return res.status(400).json({ success: false, message: "unknown action" });
      }
      logAuditFromRequest(req, { action: `pim.bulk.${action}`, entityType: "product", metadata: { count: ids.length } });
      res.json({ success: true, results });
    });

    app.get("/api/admin/pim-core/quality/:id", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "products.read")) return;
      res.json({ success: true, quality: qualityScore.updateScore(req.params.id) });
    });

    app.post("/api/admin/pim-core/products/:id/variants", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "products.write")) return;
      try {
        const variant = variantService.addVariant(req.params.id, req.body || {});
        res.status(201).json({ success: true, variant });
      } catch (err) {
        res.status(400).json({ success: false, message: err.message });
      }
    });

    app.post("/api/admin/pim-core/products/:id/media", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "products.write")) return;
      try {
        const media = mediaService.addMedia(req.params.id, req.body || {});
        res.status(201).json({ success: true, media });
      } catch (err) {
        res.status(400).json({ success: false, message: err.message });
      }
    });

    app.patch("/api/admin/pim-core/products/:id/seo", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "products.write")) return;
      try {
        const seo = seoService.updateSeo(req.params.id, req.body || {});
        res.json({ success: true, seo });
      } catch (err) {
        res.status(400).json({ success: false, message: err.message });
      }
    });

    app.get("/api/admin/pim-core/ai/capabilities", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePerm(req, res, "ai.read")) return;
      res.json({ success: true, capabilities: productAiFoundation.AI_CAPABILITIES });
    });
  },
};
