const { getBridgeStatus, fetchIntelligence, isBridgeEnabled } = require("../lib/intelligenceBridge");
const { salesDisabledResponse } = require("../lib/salesMode");

function blockSales(res) {
  const blocked = salesDisabledResponse();
  return res.status(blocked.status).json({
    success: false,
    error: blocked.error,
    code: blocked.code,
    catalogMode: true,
  });
}

module.exports = {
  register(app) {
    if (!isBridgeEnabled()) {
      console.log(
        "Intelligence production bridge disabled (set BUZZARD_INTELLIGENCE_BRIDGE=0 and no embedded mode)"
      );
    } else if (require("../lib/embeddedIntelligence").isEmbeddedIntelligenceEnabled() && !require("../lib/intelligenceBridge").intelligenceBaseUrl()) {
      console.log("Intelligence production bridge enabled (embedded mode on Node API)");
    } else {
      console.log("Intelligence production bridge enabled");
    }

    app.get("/api/intelligence/status", async (_req, res) => {
      const status = await getBridgeStatus();
      return res.json({ success: true, ...status });
    });

    app.get("/api/intelligence/production/readiness", async (_req, res) => {
      if (!isBridgeEnabled()) {
        return res.status(503).json({
          success: false,
          error: "intelligence_bridge_not_configured",
        });
      }
      const result = await fetchIntelligence("/production/readiness");
      if (!result.ok) {
        return res.status(503).json({ success: false, error: result.error });
      }
      return res.json({ success: true, catalogMode: true, ...result.data });
    });

    app.get("/api/intelligence/production/integrations", async (_req, res) => {
      if (!isBridgeEnabled()) {
        return res.status(503).json({
          success: false,
          error: "intelligence_bridge_not_configured",
        });
      }
      const result = await fetchIntelligence("/production/integrations");
      if (!result.ok) {
        return res.status(503).json({ success: false, error: result.error });
      }
      return res.json({ success: true, ...result.data });
    });

    app.get("/api/intelligence/storefront/products", async (req, res) => {
      if (!isBridgeEnabled()) {
        return res.status(503).json({
          success: false,
          error: "intelligence_bridge_not_configured",
        });
      }
      const query = req.query?.q ? `?q=${encodeURIComponent(String(req.query.q))}` : "";
      const result = await fetchIntelligence(`/storefront/products${query}`);
      if (!result.ok) {
        return res.status(503).json({ success: false, error: result.error });
      }
      return res.json({ success: true, catalogMode: true, items: result.data });
    });

    app.post("/api/intelligence/storefront/cart", (_req, res) => blockSales(res));

    app.post("/api/intelligence/storefront/cart/:cartId/items", (_req, res) => blockSales(res));

    app.post("/api/intelligence/storefront/cart/:cartId/checkout", (_req, res) => blockSales(res));
  },
};
