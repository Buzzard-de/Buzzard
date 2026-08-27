/** P1 Catalog Platform API routes (tasks 05–15). Catalog mode — no sales activation. */

const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const { requireSalesEnabled, isSalesEnabled } = require("../lib/salesMode");
const productStore = require("../lib/productStore");
const productValidator = require("../lib/productValidator");
const supplierAdapter = require("../lib/adapters/supplierAdapter");
const tecdocAdapter = require("../lib/adapters/tecdocAdapter");
const priceStockQueue = require("../lib/priceStockQueue");
const productAi = require("../lib/productAi");
const customsAi = require("../lib/customsAi");
const categoryIntelligence = require("../lib/categoryIntelligence");
const p1Platform = require("../lib/p1CatalogPlatform");
const importPipeline = require("../lib/importPipeline");
const supplierStore = require("../lib/supplierStore");

module.exports = {
  register(app) {
    if (!p1Platform.isEnabled()) {
      console.log("P1 catalog platform disabled (BUZZARD_P1_CATALOG=0)");
      return;
    }

    app.get("/api/p1/status", (_req, res) => {
      return res.json({ success: true, ...p1Platform.getPlatformStatus() });
    });

    app.post("/api/admin/p1/products/validate", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      const result = productValidator.validateProduct(req.body || {}, { partial: req.body?.partial === true });
      return res.status(result.ok ? 200 : 400).json({ success: result.ok, ...result });
    });

    app.get("/api/admin/p1/adapters", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "suppliers.read")) return;
      return res.json({ success: true, adapters: supplierAdapter.listAdapters() });
    });

    app.post("/api/admin/p1/adapters/:adapterId/fetch", async (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "imports.run")) return;
      const type = req.body?.type || "catalog";
      const adapterId = req.params.adapterId || "mock";
      let result;
      if (type === "stock") result = await supplierAdapter.fetchStock(adapterId, req.body || {});
      else if (type === "price") result = await supplierAdapter.fetchPrices(adapterId, req.body || {});
      else result = await supplierAdapter.fetchCatalog(adapterId, req.body || {});
      return res.json({ success: true, ...result });
    });

    app.post("/api/admin/p1/adapters/:adapterId/import", async (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "imports.run")) return;
      const supplierId = req.body?.supplierId || "SUP-DEMO-001";
      if (!supplierStore.getSupplier(supplierId)) {
        return res.status(400).json({ success: false, errorKey: "admin.supplier.notFound" });
      }
      const fetched = await supplierAdapter.fetchCatalog(req.params.adapterId || "mock", req.body || {});
      if (!fetched.records?.length) {
        return res.json({ success: true, imported: 0, message: "No mock records to import." });
      }
      const job = importPipeline.processRecords(fetched.records, supplierId, { mode: "mock_adapter" });
      return res.json({ success: true, job, mock: true });
    });

    app.get("/api/admin/p1/tecdoc/vehicles", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      return res.json({ success: true, vehicles: tecdocAdapter.lookupVehicle(req.query || {}) });
    });

    app.get("/api/admin/p1/tecdoc/compatibility/:sku", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      return res.json({ success: true, compatibility: tecdocAdapter.getCompatibility(req.params.sku) });
    });

    app.get("/api/admin/p1/price-stock/queue", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "sync.read")) return;
      return res.json({
        success: true,
        queue: priceStockQueue.listQueue(req.query?.status, Number(req.query?.limit) || 50),
        audit: priceStockQueue.listAudit(Number(req.query?.auditLimit) || 20),
      });
    });

    app.post("/api/admin/p1/price-stock/apply", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "products.write")) return;
      const { productId, supplierPrice, stock } = req.body || {};
      const product = productStore.getProductById(productId);
      if (!product) return res.status(404).json({ success: false, errorKey: "admin.product.notFound" });
      const supplier = supplierStore.getSupplier(product.supplier_id);
      const result = priceStockQueue.applyPriceStockUpdate({
        productId,
        supplierPrice,
        stock,
        supplier,
        previous: product,
      });
      if (!result.ok) return res.status(400).json({ success: false, ...result });
      if (!result.requiresApproval) {
        productStore.upsertProduct({ ...product, ...result.update });
      }
      return res.json({ success: true, ...result });
    });

    app.get("/api/admin/p1/ai/reviews", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      return res.json({ success: true, reviews: productAi.listReviews(req.query?.status, Number(req.query?.limit) || 50) });
    });

    app.patch("/api/admin/p1/ai/reviews/:id", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "products.write")) return;
      const allowed = ["approved", "rejected", "pending"];
      const status = req.body?.status;
      if (!allowed.includes(status)) {
        return res.status(400).json({ success: false, errorKey: "admin.ai.invalidReviewStatus" });
      }
      const updated = productAi.updateReview(req.params.id, {
        status,
        reviewer: req.adminUser?.email,
        note: req.body?.note || "",
      });
      if (!updated) return res.status(404).json({ success: false, errorKey: "admin.ai.reviewNotFound" });
      return res.json({ success: true, review: updated });
    });

    app.post("/api/admin/p1/ai/product-enrich", async (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "products.write")) return;
      const product = req.body?.product || productStore.getProductById(req.body?.productId);
      if (!product) return res.status(404).json({ success: false, errorKey: "admin.product.notFound" });
      const result = await productAi.enrichProduct(product, req.body?.options || {});
      return res.json({ success: true, enrichment: result });
    });

    app.post("/api/admin/p1/ai/customs-assess", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      const product = req.body?.product || productStore.getProductById(req.body?.productId);
      if (!product) return res.status(404).json({ success: false, errorKey: "admin.product.notFound" });
      return res.json({ success: true, ...customsAi.assessCustoms(product) });
    });

    app.get("/api/admin/p1/category/:categoryId/intelligence", async (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      const products = productStore.listProducts();
      const findings = await categoryIntelligence.analyzeCategory({
        categoryId: req.params.categoryId,
        products,
        categories: [],
      });
      return res.json({ success: true, findings });
    });

    app.post("/api/admin/p1/orders/mock", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "orders.write")) return;
      if (requireSalesEnabled(req, res)) return;
      const result = p1Platform.seedMockOrder(req.body || {});
      if (!result.ok) return res.status(result.status || 400).json({ success: false, ...result });
      return res.status(201).json({ success: true, ...result });
    });

    app.get("/api/p1/health", (_req, res) => {
      return res.json({
        ok: true,
        module: "p1-catalog-platform",
        catalog_mode: !isSalesEnabled(),
        timestamp: new Date().toISOString(),
      });
    });
  },
};
