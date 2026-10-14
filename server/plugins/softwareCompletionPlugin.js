const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const { requireCustomer } = require("../lib/customerAuth");

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

module.exports = {
  register(app) {
    app.get("/api/health/software", async (_req, res) => {
      const software = require("../lib/software");
      const pusat = require("../lib/pusat");
      const body = software.health(await pusat.getHealth());
      res.json({ success: true, liveReady: false, ...body });
    });

    app.get("/api/admin/software/health", async (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "ai.read")) return;
      const software = require("../lib/software");
      const pusat = require("../lib/pusat");
      res.json({ success: true, ...(software.health(await pusat.getHealth())) });
    });

    app.get("/api/admin/software/canonical", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "ai.read")) return;
      const software = require("../lib/software");
      res.json({ success: true, ...software.canonical.getCanonicalMap() });
    });

    app.get("/api/admin/software/marketplace", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "ai.read")) return;
      const software = require("../lib/software");
      res.json({ success: true, connectors: software.marketplace.classifyConnectors() });
    });

    app.get("/api/admin/software/report", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "ai.read")) return;
      const software = require("../lib/software");
      const { db } = require("../lib/db");
      res.json({ success: true, report: software.reporting.getOperationalReport(db) });
    });

    app.get("/api/admin/software/returns/:id", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "ai.read")) return;
      const software = require("../lib/software");
      const { db } = require("../lib/db");
      const result = software.returns.inspect(db, req.params.id);
      res.status(result.ok ? 200 : 404).json({ success: result.ok, ...result });
    });

    app.get("/api/software/search", (req, res) => {
      const software = require("../lib/software");
      const result = software.searchCanonicalCatalog({
        q: req.query.q,
        category: req.query.category,
        locale: req.query.locale,
        page: req.query.page,
        pageSize: req.query.pageSize,
      });
      res.json({ success: true, ...result });
    });

    app.post("/api/admin/software/supplier-feeds/preview", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "ai.read")) return;
      const software = require("../lib/software");
      const { db } = require("../lib/db");
      const preview = software.supplierFeeds.previewIdempotent({
        ...(req.body || {}),
        idempotencyKey: req.body?.idempotencyKey || req.headers["idempotency-key"],
      });
      software.supplierFeeds.recordPreview(db, preview);
      const conflict = preview.code === "IDEMPOTENCY_CONFLICT";
      res.status(conflict ? 409 : preview.ok || preview.status === "FEED_AVAILABLE" ? 200 : 400).json({
        success: Boolean(preview.ok) && !conflict,
        ...preview,
      });
    });

    app.post("/api/admin/software/communications/draft", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "ai.read")) return;
      const software = require("../lib/software");
      const { db } = require("../lib/db");
      const drafted = software.communications.draft(db, req.body || {});
      res.status(drafted.ok ? 200 : 400).json({ success: Boolean(drafted.ok), ...drafted });
    });

    app.post("/api/admin/software/communications/:id/send", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "ai.read")) return;
      const software = require("../lib/software");
      const { db } = require("../lib/db");
      const result = software.communications.sendPrepared(db, req.params.id);
      res.status(403).json({ success: false, ...result });
    });

    app.get("/api/admin/software/external-checklist", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "ai.read")) return;
      const software = require("../lib/software");
      res.json({
        success: true,
        liveReady: false,
        secretsIncluded: false,
        checklist: software.externalIntegrations.checklist(),
        inventory: software.externalIntegrations.inventory(),
      });
    });

    app.get("/api/admin/software/provider-diagnostics", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "ai.read")) return;
      const software = require("../lib/software");
      res.json({
        success: true,
        liveReady: false,
        secretsIncluded: false,
        diagnostics: software.providerDiagnostics.diagnose({ allowNetwork: false }),
      });
    });

    app.post("/api/admin/software/safe-workflow", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "ai.read")) return;
      const software = require("../lib/software");
      const { db } = require("../lib/db");
      const result = software.workflow.runSafeCustomerWorkflow(software, db, req.body || {});
      res.json({ success: true, live: false, ...result });
    });

    app.get("/api/customer/tracking/:orderId", (req, res) => {
      const session = requireCustomer(req, res);
      if (!session) return;
      const software = require("../lib/software");
      const { db } = require("../lib/db");
      const result = software.tracking.getForCustomer(db, {
        orderId: req.params.orderId,
        customerId: session.customerId,
      });
      if (result.denied || !result.ok) {
        res.status(result.denied ? 403 : 404).json({ success: false, error: result.denied ? "access_denied" : "not_found" });
        return;
      }
      res.json({ success: true, shipment: result.shipment });
    });

    app.get("/api/software/qr/campaign", (req, res) => {
      const software = require("../lib/software");
      const { db } = require("../lib/db");
      software.initialize(db);
      const token = String(req.query.c || req.query.p || req.query.token || "").trim();
      const locale = String(req.query.lang || req.query.locale || "de");
      res.json({
        success: true,
        live: false,
        landing: software.qrLoyalty.landingPublic(db, token),
        copy: software.qrLoyalty.copy(locale),
        redirect: software.qrLoyalty.safeRedirect(req.query.next),
      });
    });

    app.post("/api/software/qr/scan", (req, res) => {
      const software = require("../lib/software");
      const { db } = require("../lib/db");
      software.initialize(db);
      const body = req.body || {};
      const result = software.qrLoyalty.recordScan(db, {
        token: body.token,
        marketingConsent: body.marketingConsent === true,
        userAgent: req.headers["user-agent"],
        ip: req.ip,
      });
      res.status(result.ok ? 200 : 400).json({ success: result.ok, live: false, ...result });
    });

    app.get("/api/account/qr/loyalty", (req, res) => {
      const session = requireCustomer(req, res);
      if (!session) return;
      const software = require("../lib/software");
      const { db } = require("../lib/db");
      software.initialize(db);
      const token = String(req.query.token || "");
      const reveal = token
        ? software.qrLoyalty.revealAccount(db, { token, requesterCustomerId: session.customerId })
        : { ok: true };
      if (reveal.denied) {
        res.status(403).json({ success: false, error: reveal.reason });
        return;
      }
      const eligibility = software.qrLoyalty.evaluateEligibility(db, {
        customerId: session.customerId,
        orderRef: req.query.orderRef,
      });
      res.json({ success: true, live: false, reveal, eligibility });
    });

    app.get("/api/admin/software/qr/analytics", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "ai.read")) return;
      const software = require("../lib/software");
      const { db } = require("../lib/db");
      software.initialize(db);
      res.json({
        success: true,
        live: false,
        analytics: software.qrLoyalty.analytics(db),
        privacy: software.qrLoyalty.privacyNotes(),
        identity: software.orderIdentity.describeContract(),
      });
    });
  },
};
