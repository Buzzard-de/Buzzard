const smartMenu = require("../lib/embeddedSmartMenu48");

module.exports = {
  register(app) {
    app.get("/api/smart-menu-48/health", (_req, res) => {
      return res.json({ success: true, ...smartMenu.health() });
    });

    app.get("/api/smart-menu-48/taxonomy", (_req, res) => {
      return res.json({ success: true, ...smartMenu.loadTaxonomy() });
    });

    app.get("/api/smart-menu-48/main-categories", (_req, res) => {
      return res.json({ success: true, items: smartMenu.mainCategories() });
    });

    app.get("/api/smart-menu-48/main/:mainId", (req, res) => {
      const main = smartMenu.getMain(req.params.mainId);
      if (!main) {
        return res.status(404).json({ success: false, error: "main_category_not_found" });
      }
      return res.json({ success: true, main });
    });

    app.get("/api/smart-menu-48/signals/:subId", (req, res) => {
      const signals = smartMenu.getSignals(req.params.subId);
      if (!signals) {
        return res.status(404).json({ success: false, error: "subcategory_not_found" });
      }
      return res.json({ success: true, sub_id: req.params.subId, signals });
    });

    app.get("/api/smart-menu-48/search", (req, res) => {
      const query = String(req.query?.q || "").trim();
      if (!query) {
        return res.status(400).json({ success: false, error: "query_required" });
      }
      const limit = Math.min(Math.max(Number(req.query?.limit) || 50, 1), 250);
      return res.json({ success: true, items: smartMenu.search(query, limit) });
    });
  },
};
