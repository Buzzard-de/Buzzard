const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const { logAuditFromRequest } = require("../lib/coreAudit");
const adminSafetyGate = require("../lib/operations/adminSafetyGate");
const operationsAudit = require("../lib/operations/operationsAudit");
const { AUDIT_ACTIONS } = require("../core/operationsConstants");
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
const facadeAuth = require("../core/auth");
const {
  JOB_SOURCES,
  admitBackgroundJob,
  enforceControlCenterJobAccess,
  productionDeps,
} = require("../lib/controlCenterJobAdmission");
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
        const { authorizeCreate } = require("../lib/pim/productAuthorization");
        const authorized = authorizeCreate(req.adminUser);
        if (!authorized.ok) return res.status(403).json({ success: false, code: authorized.code });
        const product = productCore.createProduct(req.body || {}, {
          source: "ADMIN",
          actorId: authorized.actorId,
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
        const { authorizeUpdate } = require("../lib/pim/productAuthorization");
        const authorized = authorizeUpdate(req.adminUser);
        if (!authorized.ok) return res.status(403).json({ success: false, code: authorized.code });
        const product = productCore.updateProduct(req.params.id, req.body || {}, {
          source: "ADMIN",
          actorId: authorized.actorId,
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
      if (!enforceControlCenterJobAccess({
        requireAuth: facadeAuth.requireAuth,
        requirePermission: facadeAuth.requirePermission,
        req,
        res,
        permission: "imports.run",
      })) return;
      try {
        adminSafetyGate.requireAdminAction("import", { req, body: req.body, dryRun: true });
      } catch (err) {
        return res.status(403).json({ success: false, error: err.code, message: err.message, details: err.details });
      }
      const { admitPeripheralAutomation, peripheralDeps, PERIPHERAL_AUTOMATION_SOURCES } = require("../lib/controlCenterJobAdmission");
      const admitted = admitPeripheralAutomation({
        source: PERIPHERAL_AUTOMATION_SOURCES.PIM_IMPORT,
        jobType: "PRODUCT_IMPORT",
        actor: req.adminUser?.email || "pim_import",
        subjectId: req.body?.supplierId || "mock",
        deps: peripheralDeps(),
      });
      if (!admitted.ok) {
        return res.status(admitted.status).json({ success: false, code: admitted.code, message: admitted.message, executed: false, dryRun: true });
      }
      res.status(202).json({
        success: true,
        pendingApproval: true,
        executed: false,
        dryRun: true,
        approval: admitted.approval,
        approvalId: admitted.approval.id,
        // The id the admission reserved. No job is created here, and none exists under this id.
        importJobId: admitted.jobId,
        job: null,
      });
    });

    app.post("/api/admin/pim-core/import/enqueue", (req, res) => {
      if (!enforceControlCenterJobAccess({
        requireAuth: facadeAuth.requireAuth,
        requirePermission: facadeAuth.requirePermission,
        req,
        res,
        permission: "imports.run",
      })) return;
      try {
        adminSafetyGate.requireAdminAction("import", { req, body: req.body, dryRun: true });
      } catch (err) {
        return res.status(403).json({ success: false, error: err.code, message: err.message });
      }
      const payload = { dryRun: true };
      if (req.body?.raw && typeof req.body.raw === "object" && !Array.isArray(req.body.raw)) {
        payload.raw = req.body.raw;
      }
      const result = admitBackgroundJob({
        body: {
          jobType: JOB_TYPES_PIM.PRODUCT_IMPORT,
          payload,
        },
        actor: req.adminUser?.email,
        source: JOB_SOURCES.PIM_IMPORT,
        deps: productionDeps(),
      });
      if (!result.ok) {
        return res.status(result.status).json({ success: false, code: result.code, message: result.message });
      }
      res.status(202).json({
        success: true,
        pendingApproval: true,
        approval: result.approval,
        task: result.task,
        job: null,
      });
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
