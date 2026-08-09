const { extractToken, verifyToken } = require("../lib/dbAuth");
const { extractToken: extractAdminToken, getSession } = require("../lib/auth");
const marketplaceHub = require("../lib/marketplaceHub");

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
    if (!marketplaceHub.isEnabled()) {
      console.log("Marketplace hub disabled (BUZZARD_MARKETPLACE_HUB=0 or BUZZARD_DB_ENABLED=0)");
      return;
    }

    app.get("/api/admin/marketplace-hub/marketplaces", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(marketplaceHub.listMarketplaces());
    });

    app.patch("/api/admin/marketplace-hub/marketplaces/:code", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = marketplaceHub.updateMarketplace(req.params.code, req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result.marketplace);
    });

    app.post("/api/admin/marketplace-hub/sync/stock", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(marketplaceHub.queueStockSync());
    });

    app.post("/api/admin/marketplace-hub/sync/prices", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(marketplaceHub.queuePriceSync());
    });

    app.post("/api/admin/marketplace-hub/sync/orders", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(marketplaceHub.queueOrderSync());
    });

    app.post("/api/admin/marketplace-hub/listings", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = marketplaceHub.upsertListing(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    });

    app.post("/api/admin/marketplace-hub/sku-map", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = marketplaceHub.upsertSkuMapping(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    });

    app.get("/api/admin/marketplace-hub/sync-jobs", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(marketplaceHub.listSyncJobs());
    });

    app.post("/api/admin/marketplace-hub/sync-jobs/:id/result", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = marketplaceHub.updateSyncJobResult(req.params.id, req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    });

    app.get("/api/admin/marketplace-hub/channel-orders", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(marketplaceHub.listChannelOrders());
    });

    app.get("/api/admin/marketplace-hub/status", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(marketplaceHub.getMarketplaceHubStatus());
    });

    app.post("/api/marketplace-hub/order-webhook", (req, res) => {
      const result = marketplaceHub.importOrderWebhook(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(result.status || 202).json(result);
    });
  },
};
