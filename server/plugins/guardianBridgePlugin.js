const {
  fetchGuardian,
  getGuardianStatus,
  isGuardianConfigured,
} = require("../lib/guardianBridge");
const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");

module.exports = {
  register(app) {
    app.get("/api/guardian/status", async (_req, res) => {
      res.json(await getGuardianStatus());
    });

    app.get("/api/guardian/health", async (_req, res) => {
      if (!isGuardianConfigured()) {
        return res.status(503).json({ error: "guardian_not_configured" });
      }
      const result = await fetchGuardian("/health");
      if (!result.ok) {
        return res.status(502).json({ error: "guardian_unreachable", detail: result });
      }
      return res.json(result.body);
    });

    app.get("/api/admin/guardian/approvals", async (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      if (!isGuardianConfigured()) {
        return res.status(503).json({ error: "guardian_not_configured" });
      }
      const limit = req.query.limit ? `?limit=${req.query.limit}` : "";
      const result = await fetchGuardian(`/approvals/pending${limit}`);
      if (!result.ok) {
        return res.status(502).json({ error: "guardian_unreachable", detail: result });
      }
      return res.json(result.body);
    });

    app.get("/api/admin/guardian/incidents", async (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      if (!isGuardianConfigured()) {
        return res.status(503).json({ error: "guardian_not_configured" });
      }
      const limit = req.query.limit ? `?limit=${req.query.limit}` : "";
      const result = await fetchGuardian(`/incidents/open${limit}`);
      if (!result.ok) {
        return res.status(502).json({ error: "guardian_unreachable", detail: result });
      }
      return res.json(result.body);
    });

    app.get("/api/admin/guardian/costs", async (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "products.read")) return;
      if (!isGuardianConfigured()) {
        return res.status(503).json({ error: "guardian_not_configured" });
      }
      const result = await fetchGuardian("/costs/dashboard");
      if (!result.ok) {
        return res.status(502).json({ error: "guardian_unreachable", detail: result });
      }
      return res.json(result.body);
    });
  },
};
