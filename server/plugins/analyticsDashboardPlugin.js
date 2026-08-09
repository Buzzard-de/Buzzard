const { extractToken, verifyToken } = require("../lib/dbAuth");
const { extractToken: extractAdminToken, getSession } = require("../lib/auth");
const analyticsDashboard = require("../lib/analyticsDashboard");

function requireAnyAdmin(req, res) {
  const bearer = extractToken(req);
  if (bearer) {
    try {
      const user = verifyToken(bearer);
      if (user.role === "admin") {
        req.user = user;
        return user;
      }
    } catch {
      /* fall through */
    }
  }

  const adminToken = extractAdminToken(req);
  const session = getSession(adminToken);
  if (session) {
    req.adminUser = session;
    return session;
  }

  res.status(403).json({ error: "Admin access required" });
  return null;
}

module.exports = {
  register(app) {
    if (!analyticsDashboard.isEnabled()) {
      console.log("Analytics dashboard disabled (BUZZARD_ANALYTICS_DASHBOARD=0 or BUZZARD_DB_ENABLED=0)");
      return;
    }

    app.post("/api/analytics/events", (req, res) => {
      const result = analyticsDashboard.recordEvent(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(202).json(result);
    });

    app.get("/api/admin/analytics-dashboard/status", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(analyticsDashboard.getAnalyticsDashboardStatus());
    });

    app.get("/api/admin/analytics-dashboard/summary", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(analyticsDashboard.getSummary());
    });

    app.get("/api/admin/analytics-dashboard/daily", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(analyticsDashboard.getDailySeries());
    });

    app.get("/api/admin/analytics-dashboard/countries", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(analyticsDashboard.getCountryBreakdown());
    });

    app.get("/api/admin/analytics-dashboard/categories", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(analyticsDashboard.getCategoryBreakdown());
    });

    app.get("/api/admin/analytics-dashboard/products", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(analyticsDashboard.getProductBreakdown());
    });

    app.get("/api/admin/analytics-dashboard/sources", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(analyticsDashboard.getSourceBreakdown());
    });

    app.get("/api/admin/analytics-dashboard/funnel", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(analyticsDashboard.getFunnel());
    });
  },
};
