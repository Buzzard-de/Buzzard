const { listConnectors, createConnector, snapshot } = require("../lib/marketplace/marketplaceConnectorRegistry");

module.exports = {
  register(app) {
    app.get("/api/marketplace/connectors", (_req, res) => {
      res.json({ success: true, live: false, ...snapshot(), connectors: listConnectors() });
    });
    app.post("/api/marketplace/connectors/:id/publish", async (req, res) => {
      const { requireSalesEnabled } = require("../lib/salesMode");
      if (!requireSalesEnabled(req, res)) return;
      const connector = createConnector(req.params.id);
      if (!connector.id) return res.status(404).json({ success: false, ...connector });
      const result = await connector.publishListing(req.body?.listing || {});
      res.status(result.ok ? 200 : 403).json({ success: result.ok, ...result });
    });
  },
};