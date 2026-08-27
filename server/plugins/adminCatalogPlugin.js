const fs = require("fs");
const path = require("path");
const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const { logAudit } = require("../lib/audit");
const productStore = require("../lib/productStore");
const supplierStore = require("../lib/supplierStore");
const importPipeline = require("../lib/importPipeline");
const syncLog = require("../lib/syncLog");
const pricing = require("../lib/pricing");
const productValidator = require("../lib/productValidator");
const { validateImportPayload } = require("../lib/security");
const { logSecurityEvent } = require("../lib/securityLog");

const ordersFile = path.join(__dirname, "..", "data", "orders.json");

function readOrders() {
  if (!fs.existsSync(ordersFile)) return [];
  try {
    return JSON.parse(fs.readFileSync(ordersFile, "utf8") || "[]");
  } catch {
    return [];
  }
}

function writeOrders(orders) {
  fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2), "utf8");
}

function audit(req, payload) {
  logAudit({
    userId: req.adminUser.userId,
    userEmail: req.adminUser.email,
    ...payload,
  });
}

module.exports = {
  register(app) {
    app.get("/api/admin/products", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      const products = productStore.listProducts({
        supplierId: req.query.supplierId,
        status: req.query.status,
        q: req.query.q,
      });
      return res.json({ success: true, products, total: products.length });
    });

    app.get("/api/admin/products/:id", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      const product = productStore.getProductById(req.params.id);
      if (!product) return res.status(404).json({ success: false, errorKey: "admin.product.notFound" });
      return res.json({ success: true, product });
    });

    app.post("/api/admin/products", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "products.write")) return;
      const body = req.body || {};
      const supplier = supplierStore.getSupplier(body.supplier_id);
      if (!supplier) return res.status(400).json({ success: false, errorKey: "admin.supplier.notFound" });

      const duplicate = productStore.findDuplicate({
        supplierId: body.supplier_id,
        supplierSku: body.supplier_sku,
        ean: body.ean_gtin,
      });
      if (duplicate) {
        return res.status(409).json({ success: false, errorKey: "admin.product.duplicate", productId: duplicate.id });
      }

      const validated = productValidator.validateProduct(body);
      if (!validated.ok) {
        return res.status(400).json({ success: false, errorKey: "admin.product.validation", errors: validated.errors });
      }

      const supplierPrice = body.supplier_price || { amount: 0, currency: "EUR" };

      const product = productStore.upsertProduct({
        ...validated.product,
        id: productStore.nextProductId(),
        sku: body.sku || validated.product.sku || `BUZ-NEW-${Date.now()}`,
        price:
          body.price ||
          pricing.calculateSalePrice({
            supplierPrice: supplierPrice.amount,
            markupPercent: supplier.default_markup_percent,
            minimumMarginPercent: supplier.minimum_margin_percent,
          }),
        supplier_price: supplierPrice,
        buy_now_enabled: body.buy_now_enabled ?? false,
        created_at: new Date().toISOString(),
      });

      audit(req, { action: "create", entityType: "product", entityId: product.id, field: null, oldValue: null, newValue: product.id });
      return res.status(201).json({ success: true, product });
    });

    app.put("/api/admin/products/:id", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "products.write")) return;
      const existing = productStore.getProductById(req.params.id);
      if (!existing) return res.status(404).json({ success: false, errorKey: "admin.product.notFound" });

      const body = req.body || {};
      const merged = { ...existing, ...body, id: existing.id };
      const validated = productValidator.validateProduct(merged, { partial: false });
      if (!validated.ok) {
        return res.status(400).json({ success: false, errorKey: "admin.product.validation", errors: validated.errors });
      }

      const duplicate = productStore.findDuplicate({
        supplierId: body.supplier_id || existing.supplier_id,
        supplierSku: body.supplier_sku || existing.supplier_sku,
        ean: body.ean_gtin || existing.ean_gtin,
        excludeId: existing.id,
      });
      if (duplicate) {
        return res.status(409).json({ success: false, errorKey: "admin.product.duplicate", productId: duplicate.id });
      }

      const updated = productStore.upsertProduct({ ...validated.product, id: existing.id });
      Object.keys(body).forEach((field) => {
        audit(req, {
          action: "update",
          entityType: "product",
          entityId: existing.id,
          field,
          oldValue: existing[field],
          newValue: body[field],
        });
      });
      return res.json({ success: true, product: updated });
    });

    app.patch("/api/admin/products/:id/status", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "products.write")) return;
      const existing = productStore.getProductById(req.params.id);
      if (!existing) return res.status(404).json({ success: false, errorKey: "admin.product.notFound" });
      const status = req.body?.status;
      if (!["draft", "active", "paused", "archived"].includes(status)) {
        return res.status(400).json({ success: false, errorKey: "admin.product.invalidStatus" });
      }
      const updated = productStore.upsertProduct({ ...existing, status });
      audit(req, { action: "status", entityType: "product", entityId: existing.id, field: "status", oldValue: existing.status, newValue: status });
      return res.json({ success: true, product: updated });
    });

    app.get("/api/admin/suppliers", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "suppliers.read")) return;
      return res.json({
        success: true,
        suppliers: supplierStore.listSuppliers().map(supplierStore.toAdminSupplier),
        mappings: supplierStore.readMappings(),
      });
    });

    app.post("/api/admin/suppliers", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "suppliers.read")) return;
      if (req.adminUser.role !== "administrator") {
        return res.status(403).json({ success: false, errorKey: "admin.auth.forbidden" });
      }
      const body = req.body || {};
      if (!body.supplier_id || !body.supplier_name) {
        return res.status(400).json({ success: false, errorKey: "admin.supplier.invalid" });
      }
      const supplier = supplierStore.upsertSupplier(body);
      if (body.api_secret) supplierStore.setSupplierSecret(body.supplier_id, body.api_secret);
      audit(req, { action: "upsert", entityType: "supplier", entityId: body.supplier_id, field: null, oldValue: null, newValue: body.supplier_id });
      return res.status(201).json({ success: true, supplier: supplierStore.toAdminSupplier(supplier) });
    });

    app.post("/api/admin/import", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "imports.run")) return;
      const { supplierId, format, payload, csvText, mode } = req.body || {};
      if (!supplierId) return res.status(400).json({ success: false, errorKey: "admin.import.supplierRequired" });

      const validated = validateImportPayload(req.body || {});
      if (!validated.ok) return res.status(400).json({ success: false, errorKey: validated.errorKey });

      let job;
      try {
        if (validated.format === "csv") job = importPipeline.importFromCsv(csvText || validated.payload, supplierId, { mode });
        else if (validated.format === "manual") job = importPipeline.importManual(validated.payload, supplierId, { mode: "manual" });
        else job = importPipeline.importFromJson(validated.payload, supplierId, { mode: mode || "full" });
        audit(req, { action: "import", entityType: "supplier", entityId: supplierId, field: format, oldValue: null, newValue: job.id });
        return res.json({ success: true, job });
      } catch (error) {
        logSecurityEvent({
          type: "admin_import_failed",
          success: false,
          ip: req.headers["x-forwarded-for"] || req.socket?.remoteAddress,
          userId: req.adminUser?.userId,
          path: "/api/admin/import",
          detail: { supplierId, format },
        });
        return res.status(500).json({ success: false, errorKey: "admin.import.failed" });
      }
    });

    app.get("/api/admin/sync/logs", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "sync.read")) return;
      return res.json({
        success: true,
        syncJobs: syncLog.listSyncJobs(100),
        importLogs: syncLog.listImportLogs(100),
      });
    });

    app.post("/api/admin/sync/retry", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "sync.run")) return;
      const result = importPipeline.retryImportLog(req.body?.logId);
      if (!result) return res.status(404).json({ success: false, errorKey: "admin.sync.retryNotFound" });
      return res.json({ success: true, job: result });
    });

    app.get("/api/admin/orders", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "orders.read")) return;
      return res.json({ success: true, orders: readOrders().slice().reverse() });
    });

    app.patch("/api/admin/orders/:orderNumber/status", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "orders.write")) return;
      const status = req.body?.status;
      const allowed = ["pending", "payment_pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"];
      if (!allowed.includes(status)) {
        return res.status(400).json({ success: false, errorKey: "admin.order.invalidStatus" });
      }
      const orders = readOrders();
      const idx = orders.findIndex((o) => o.orderNumber === req.params.orderNumber);
      if (idx < 0) return res.status(404).json({ success: false, errorKey: "admin.order.notFound" });
      const oldStatus = orders[idx].status;
      orders[idx].status = status;
      writeOrders(orders);
      audit(req, {
        action: "status",
        entityType: "order",
        entityId: req.params.orderNumber,
        field: "status",
        oldValue: oldStatus,
        newValue: status,
      });
      return res.json({ success: true, order: orders[idx] });
    });
  },
};
