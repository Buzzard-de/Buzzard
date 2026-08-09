const { extractToken, verifyToken } = require("../lib/dbAuth");
const { extractToken: extractAdminToken, getSession } = require("../lib/auth");
const marketingCenter = require("../lib/marketingCenter");

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
    if (!marketingCenter.isEnabled()) {
      console.log("Marketing center disabled (BUZZARD_MARKETING_CENTER=0 or BUZZARD_DB_ENABLED=0)");
      return;
    }

    app.get("/api/admin/marketing-center/providers", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(marketingCenter.listProviders());
    });

    app.patch("/api/admin/marketing-center/providers/:provider", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = marketingCenter.updateProvider(req.params.provider, req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result.provider);
    });

    app.post("/api/admin/marketing-center/campaigns", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = marketingCenter.createCampaign(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(result.status || 201).json(result.campaign);
    });

    app.get("/api/admin/marketing-center/campaigns", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(marketingCenter.listCampaigns());
    });

    app.post("/api/admin/marketing-center/campaigns/:id/spend", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = marketingCenter.addCampaignSpend(req.params.id, req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    });

    app.get("/api/admin/marketing-center/summary", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(marketingCenter.getSummary());
    });

    app.get("/api/admin/marketing-center/channels", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(marketingCenter.getChannelBreakdown());
    });

    app.get("/api/admin/marketing-center/utm", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(marketingCenter.getUtmBreakdown());
    });

    app.get("/api/admin/marketing-center/status", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(marketingCenter.getMarketingCenterStatus());
    });

    app.post("/api/marketing-center/conversion", (req, res) => {
      const result = marketingCenter.recordConversion(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(result.status || 202).json(result);
    });

    app.post("/api/marketing-center/events", (req, res) => {
      const result = marketingCenter.recordEvent(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(result.status || 202).json(result);
    });

    app.get("/api/marketing-center/campaign/:slug", (req, res) => {
      const result = marketingCenter.getCampaignBySlug(req.params.slug);
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result);
    });
  },
};
