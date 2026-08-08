const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const { logAudit } = require("../lib/audit");
const seoStore = require("../lib/seoStore");
const redirectStore = require("../lib/redirectStore");
const feedAdapters = require("../lib/feedAdapters");

module.exports = {
  register(app) {
    app.get("/api/feeds/google-merchant.tsv", (req, res) => {
      const rows = feedAdapters.googleMerchantRows();
      res.setHeader("Content-Type", "text/tab-separated-values; charset=utf-8");
      return res.send(feedAdapters.toCsv(rows));
    });

    app.get("/api/feeds/google-merchant.json", (req, res) => {
      return res.json({ success: true, products: feedAdapters.googleMerchantRows() });
    });

    app.get("/api/feeds/ebay.tsv", (req, res) => {
      res.setHeader("Content-Type", "text/tab-separated-values; charset=utf-8");
      return res.send(feedAdapters.toCsv(feedAdapters.ebayRows()));
    });

    app.get("/api/feeds/amazon.tsv", (req, res) => {
      res.setHeader("Content-Type", "text/tab-separated-values; charset=utf-8");
      return res.send(feedAdapters.toCsv(feedAdapters.amazonRows()));
    });

    app.get("/api/redirects/lookup", (req, res) => {
      const pathname = String(req.query?.path || "");
      const redirect = redirectStore.findRedirect(pathname);
      if (!redirect) return res.status(404).json({ success: false });
      return res.json({ success: true, redirect });
    });

    app.get("/api/admin/seo/overrides", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "seo.read")) return;
      return res.json({ success: true, overrides: seoStore.loadOverrides() });
    });

    app.put("/api/admin/seo/overrides/:entityType/:entityId", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "seo.write")) return;
      const allowed = new Set(["products", "categories", "pages"]);
      if (!allowed.has(req.params.entityType)) {
        return res.status(400).json({ success: false, errorKey: "seo.override.invalidEntity" });
      }
      const overrides = seoStore.upsertOverride(req.params.entityType, req.params.entityId, req.body || {});
      logAudit({
        userId: req.adminUser.id,
        userEmail: req.adminUser.email,
        action: "seo_override_update",
        entityType: req.params.entityType,
        entityId: req.params.entityId,
        field: "seo",
        oldValue: null,
        newValue: JSON.stringify(req.body || {}),
      });
      return res.json({ success: true, overrides });
    });

    app.get("/api/admin/seo/redirects", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "seo.read")) return;
      return res.json({ success: true, redirects: redirectStore.listRedirects() });
    });

    app.post("/api/admin/seo/redirects", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "seo.write")) return;
      const { from, to, permanent, note } = req.body || {};
      if (!from || !to) {
        return res.status(400).json({ success: false, errorKey: "seo.redirect.invalid" });
      }
      const redirect = redirectStore.addRedirect({ from, to, permanent, note });
      logAudit({
        userId: req.adminUser.id,
        userEmail: req.adminUser.email,
        action: "redirect_create",
        entityType: "redirect",
        entityId: from,
        field: "to",
        oldValue: null,
        newValue: to,
      });
      return res.status(201).json({ success: true, redirect });
    });
  },
};
