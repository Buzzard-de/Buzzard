const { extractToken, verifyToken } = require("../lib/dbAuth");
const { extractToken: extractAdminToken, getSession } = require("../lib/auth");
const mod = require("../lib/marketplaceV35");

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
    if (!mod.isEnabled()) {
      console.log("Marketplace Integration disabled (BUZZARD_MARKETPLACE_V35=0 or BUZZARD_DB_ENABLED=0)");
      return;
    }

    app.post("/api/marketplace-v35/records", (req, res) => {
      const result = mod.createRecord(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(201).json(result.record);
    });

    app.get("/api/marketplace-v35/records", (req, res) => {
      return res.json(mod.listRecords());
    });

    app.get("/api/marketplace-v35/records/:code", (req, res) => {
      const record = mod.getRecordByCode(req.params.code);
      if (!record) return res.status(404).json({ error: "not found" });
      return res.json(record);
    });

    app.patch("/api/marketplace-v35/records/:id", (req, res) => {
      const result = mod.updateRecord(Number(req.params.id), req.body || {});
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result.record);
    });

    app.post("/api/marketplace-v35/jobs", (req, res) => {
      return res.status(202).json(mod.createJob(req.body || {}));
    });

    app.get("/api/marketplace-v35/jobs", (req, res) => {
      return res.json(mod.listJobs());
    });

    app.get("/api/admin/marketplace-v35/overview", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(mod.getMarketplaceV35Overview());
    });
  },
};
