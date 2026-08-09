const { extractToken, verifyToken } = require("../lib/dbAuth");
const { extractToken: extractAdminToken, getSession } = require("../lib/auth");
const advancedSearch = require("../lib/advancedSearch");

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
    if (!advancedSearch.isEnabled()) {
      console.log("Advanced search disabled (BUZZARD_ADVANCED_SEARCH=0 or BUZZARD_DB_ENABLED=0)");
      return;
    }

    app.get("/api/advanced-search/suggest", (req, res) => {
      return res.json(advancedSearch.suggest(req.query?.q));
    });

    app.get("/api/advanced-search", (req, res) => {
      return res.json(advancedSearch.search(req.query || {}));
    });

    app.post("/api/advanced-search/:sku/click", (req, res) => {
      const result = advancedSearch.recordClick(req.params.sku);
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result);
    });

    app.post("/api/admin/advanced-search/products", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = advancedSearch.createProduct(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(201).json(result.product);
    });

    app.post("/api/admin/advanced-search/synonyms", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = advancedSearch.upsertSynonym(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    });

    app.get("/api/admin/advanced-search/overview", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(advancedSearch.getSearchOverview());
    });

    app.get("/api/admin/advanced-search/zero-results", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(advancedSearch.getZeroResultQueries());
    });
  },
};
