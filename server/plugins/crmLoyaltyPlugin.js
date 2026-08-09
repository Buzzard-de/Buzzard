const { extractToken, verifyToken } = require("../lib/dbAuth");
const { extractToken: extractAdminToken, getSession } = require("../lib/auth");
const crmLoyalty = require("../lib/crmLoyalty");

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

function requireCustomer(req, res) {
  const bearer = extractToken(req);
  if (!bearer) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  try {
    req.user = verifyToken(bearer);
    return req.user;
  } catch {
    res.status(401).json({ error: "Invalid token" });
    return null;
  }
}

module.exports = {
  register(app) {
    if (!crmLoyalty.isEnabled()) {
      console.log("CRM loyalty disabled (BUZZARD_CRM_LOYALTY=0 or BUZZARD_DB_ENABLED=0)");
      return;
    }

    app.get("/api/customer/crm/profile", (req, res) => {
      if (!requireCustomer(req, res)) return;
      return res.json(crmLoyalty.getCrmProfile(req.user.sub));
    });

    app.put("/api/customer/crm/profile", (req, res) => {
      if (!requireCustomer(req, res)) return;
      return res.json(crmLoyalty.upsertCrmProfile(req.user.sub, req.body || {}));
    });

    app.get("/api/customer/loyalty", (req, res) => {
      if (!requireCustomer(req, res)) return;
      return res.json(crmLoyalty.getLoyaltyDashboard(req.user.sub));
    });

    app.post("/api/customer/loyalty/redeem", (req, res) => {
      if (!requireCustomer(req, res)) return;
      const result = crmLoyalty.redeemReward(req.user.sub, req.body?.rewardId);
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    });

    app.post("/api/customer/cart/abandoned", (req, res) => {
      if (!requireCustomer(req, res)) return;
      return res.json(crmLoyalty.trackAbandonedCart(req.user.sub, req.body || {}));
    });

    app.post("/api/customer/cart/recovered", (req, res) => {
      if (!requireCustomer(req, res)) return;
      return res.json(crmLoyalty.markCartRecovered(req.user.sub));
    });

    app.get("/api/customer/offers", (req, res) => {
      if (!requireCustomer(req, res)) return;
      return res.json(crmLoyalty.listUserOffers(req.user.sub));
    });

    app.get("/api/admin/crm-loyalty/status", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(crmLoyalty.getCrmLoyaltyStatus());
    });

    app.get("/api/admin/crm-loyalty/segments", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(crmLoyalty.listSegmentsAdmin());
    });

    app.get("/api/admin/crm-loyalty/abandoned-carts", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(crmLoyalty.listAbandonedCartsAdmin());
    });

    app.get("/api/admin/crm-loyalty/offers", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(crmLoyalty.listOffersAdmin());
    });

    app.get("/api/admin/crm-loyalty/loyalty", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(crmLoyalty.listLoyaltyAccountsAdmin());
    });

    app.post("/api/admin/crm-loyalty/points/earn", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const userId = Number(req.body?.userId);
      if (!userId) return res.status(400).json({ error: "userId required" });
      const result = crmLoyalty.earnPoints(userId, req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    });

    app.post("/api/admin/crm-loyalty/recovery-campaigns/queue", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(crmLoyalty.queueRecoveryCampaigns(req.body?.channel || "email"));
    });
  },
};
