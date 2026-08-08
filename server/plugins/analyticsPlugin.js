const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const { logAudit } = require("../lib/audit");
const analyticsEngine = require("../lib/analyticsEngine");

function parseQuery(req) {
  const preset = req.query?.range || req.query?.preset || "last_30_days";
  return analyticsEngine.resolveRange(preset, req.query?.from, req.query?.to);
}

function role(req) {
  return req.adminUser?.role || "read_only";
}

module.exports = {
  register(app) {
    app.get("/api/admin/analytics/overview", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "analytics.read")) return;
      const range = parseQuery(req);
      return res.json({ success: true, data: analyticsEngine.computeOverview(range, role(req)) });
    });

    app.get("/api/admin/analytics/sales", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "analytics.read")) return;
      const range = parseQuery(req);
      const data = analyticsEngine.computeSalesAnalytics(range, role(req));
      if (data.forbidden) return res.status(403).json({ success: false, errorKey: "admin.auth.forbidden" });
      return res.json({ success: true, data });
    });

    app.get("/api/admin/analytics/categories", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "analytics.read")) return;
      const range = parseQuery(req);
      const data = analyticsEngine.computeCategoryAnalytics(range, role(req), req.query?.categoryId);
      if (data.forbidden) return res.status(403).json({ success: false, errorKey: "admin.auth.forbidden" });
      return res.json({ success: true, data });
    });

    app.get("/api/admin/analytics/products", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "analytics.read")) return;
      const range = parseQuery(req);
      const data = analyticsEngine.computeProductAnalytics(range, role(req));
      if (data.forbidden) return res.status(403).json({ success: false, errorKey: "admin.auth.forbidden" });
      return res.json({ success: true, data });
    });

    app.get("/api/admin/analytics/customers", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "analytics.read")) return;
      const range = parseQuery(req);
      const data = analyticsEngine.computeCustomerAnalytics(range, role(req));
      if (data.forbidden) return res.status(403).json({ success: false, errorKey: "admin.auth.forbidden" });
      return res.json({ success: true, data });
    });

    app.get("/api/admin/analytics/inventory", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "analytics.read")) return;
      const data = analyticsEngine.computeInventoryAnalytics(role(req));
      if (data.forbidden) return res.status(403).json({ success: false, errorKey: "admin.auth.forbidden" });
      return res.json({ success: true, data });
    });

    app.get("/api/admin/analytics/suppliers", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "analytics.read")) return;
      const range = parseQuery(req);
      const data = analyticsEngine.computeSupplierAnalytics(range, role(req));
      if (data.forbidden) return res.status(403).json({ success: false, errorKey: "admin.auth.forbidden" });
      return res.json({ success: true, data });
    });

    app.get("/api/admin/analytics/finance", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "analytics.finance")) return;
      const range = parseQuery(req);
      const data = analyticsEngine.computeFinanceAnalytics(range, role(req));
      if (data.forbidden) return res.status(403).json({ success: false, errorKey: "admin.auth.forbidden" });
      return res.json({ success: true, data });
    });

    app.get("/api/admin/analytics/returns", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "analytics.read")) return;
      const range = parseQuery(req);
      const data = analyticsEngine.computeReturnsAnalytics(range, role(req));
      if (data.forbidden) return res.status(403).json({ success: false, errorKey: "admin.auth.forbidden" });
      return res.json({ success: true, data });
    });

    app.get("/api/admin/analytics/export", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "analytics.export")) return;
      const range = parseQuery(req);
      const section = req.query?.section || "sales";
      const format = req.query?.format || "csv";
      const result = analyticsEngine.buildExport(section, range, role(req), format);
      if (result.forbidden) return res.status(403).json({ success: false, errorKey: "admin.auth.forbidden" });
      logAudit({
        userId: req.adminUser.id,
        userEmail: req.adminUser.email,
        action: "analytics_export",
        entityType: "analytics",
        entityId: section,
        field: "format",
        oldValue: null,
        newValue: format,
      });
      res.setHeader("Content-Type", result.contentType);
      if (result.filename) res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
      return res.send(result.body);
    });
  },
};
