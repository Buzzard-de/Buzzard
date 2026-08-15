const embedded = require("../lib/embeddedIntelligence");
const unification = require("../lib/taxonomyUnification");

module.exports = {
  register(app) {
    app.get("/api/taxonomy", (_req, res) => {
      const nodes = embedded.allNodes();
      return res.json({
        success: true,
        count: nodes.length,
        snapshot: embedded.taxonomySnapshot(),
        nodes,
      });
    });

    app.get("/api/taxonomy/snapshot", (_req, res) => {
      return res.json({ success: true, ...embedded.taxonomySnapshot() });
    });

    app.get("/api/taxonomy/categories", (req, res) => {
      const level = Math.min(Math.max(Number(req.query?.level) || 1, 1), 3);
      return res.json({ success: true, items: embedded.byLevel(level) });
    });

    app.get("/api/taxonomy/category/:nodeId", (req, res) => {
      const node = embedded.getNode(req.params.nodeId);
      if (!node) {
        return res.status(404).json({ success: false, error: "category_not_found" });
      }
      return res.json({
        success: true,
        node,
        children: embedded.children(req.params.nodeId),
        path: embedded.nodePath(req.params.nodeId),
      });
    });

    app.get("/api/taxonomy/search", (req, res) => {
      const query = String(req.query?.q || "").trim();
      if (!query) {
        return res.status(400).json({ success: false, error: "query_required" });
      }
      return res.json({ success: true, items: embedded.search(query).slice(0, 50) });
    });

    app.get("/api/taxonomy/status", (_req, res) => {
      return res.json({ success: true, ...unification.unificationStatus() });
    });

    app.get("/api/taxonomy/canonical/roots", (_req, res) => {
      return res.json({ success: true, items: unification.canonicalRoots() });
    });

    app.get("/api/taxonomy/canonical/:nodeId", (req, res) => {
      const node = unification.getCanonicalNode(req.params.nodeId);
      if (!node) {
        return res.status(404).json({ success: false, error: "category_not_found" });
      }
      return res.json({
        success: true,
        node,
        children: unification.canonicalChildren(req.params.nodeId),
        path: unification.canonicalPath(req.params.nodeId),
      });
    });

    app.get("/api/taxonomy/resolve", (req, res) => {
      const legacyId = String(req.query?.legacy_id || "").trim();
      if (!legacyId) {
        return res.status(400).json({ success: false, error: "legacy_id_required" });
      }
      const system = String(req.query?.system || "shop");
      return res.json({ success: true, ...unification.resolveLegacy(legacyId, system) });
    });

    app.get("/api/taxonomy/aliases", (req, res) => {
      const system = req.query?.system ? String(req.query.system) : undefined;
      return res.json({ success: true, items: unification.listAliases(system) });
    });
  },
};
