const { extractToken, verifyToken } = require("../lib/dbAuth");
const { extractToken: extractAdminToken, getSession } = require("../lib/auth");
const marketingLoyalty = require("../lib/marketingLoyalty");

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
    if (!marketingLoyalty.isEnabled()) {
      console.log("Marketing loyalty disabled (BUZZARD_MARKETING_LOYALTY=0 or BUZZARD_DB_ENABLED=0)");
      return;
    }

    app.post("/api/marketing-loyalty/campaigns", (req, res) => {
      const result = marketingLoyalty.createCampaign(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(201).json(result.campaign);
    });

    app.get("/api/marketing-loyalty/campaigns", (req, res) => {
      return res.json(marketingLoyalty.listCampaigns());
    });

    app.patch("/api/admin/marketing-loyalty/campaigns/:id", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = marketingLoyalty.updateCampaign(req.params.id, req.body || {});
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result.campaign);
    });

    app.post("/api/marketing-loyalty/campaigns/:code/apply", (req, res) => {
      const result = marketingLoyalty.applyCampaign(req.params.code, req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    });

    app.post("/api/marketing-loyalty/campaigns/:code/use", (req, res) => {
      const result = marketingLoyalty.useCampaign(req.params.code, req.body || {});
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result);
    });

    app.post("/api/marketing-loyalty/accounts", (req, res) => {
      const result = marketingLoyalty.createLoyaltyAccount(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    });

    app.post("/api/marketing-loyalty/points", (req, res) => {
      const result = marketingLoyalty.adjustPoints(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result.account);
    });

    app.post("/api/marketing-loyalty/referrals/create", (req, res) => {
      const result = marketingLoyalty.createReferral(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(201).json(result.referral);
    });

    app.post("/api/marketing-loyalty/referrals/complete", (req, res) => {
      const result = marketingLoyalty.completeReferral(req.body || {});
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result);
    });

    app.put("/api/marketing-loyalty/preferences/:customerId", (req, res) => {
      const result = marketingLoyalty.updatePreferences(req.params.customerId, req.body || {});
      return res.json(result.preferences);
    });

    app.get("/api/marketing-loyalty/preferences/:customerId", (req, res) => {
      return res.json(marketingLoyalty.getPreferences(req.params.customerId));
    });

    app.get("/api/marketing-loyalty/:customerId", (req, res) => {
      const result = marketingLoyalty.getLoyaltyProfile(req.params.customerId);
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result);
    });

    app.get("/api/admin/marketing-loyalty/overview", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(marketingLoyalty.getMarketingLoyaltyOverview());
    });
  },
};
