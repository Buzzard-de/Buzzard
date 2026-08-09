const { extractToken, verifyToken } = require("../lib/dbAuth");
const { extractToken: extractAdminToken, getSession } = require("../lib/auth");
const supplierIntegrationHub = require("../lib/supplierIntegrationHub");

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
    if (!supplierIntegrationHub.isEnabled()) {
      console.log(
        "Supplier integration hub disabled (BUZZARD_SUPPLIER_INTEGRATION_HUB=0 or BUZZARD_DB_ENABLED=0)"
      );
      return;
    }

    app.post("/api/supplier-integration-hub/suppliers", (req, res) => {
      const result = supplierIntegrationHub.createSupplier(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(201).json(result.supplier);
    });

    app.get("/api/supplier-integration-hub/suppliers", (req, res) => {
      return res.json(supplierIntegrationHub.listSuppliers());
    });

    app.get("/api/supplier-integration-hub/suppliers/:code", (req, res) => {
      const result = supplierIntegrationHub.getSupplierByCode(req.params.code);
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result);
    });

    app.post("/api/supplier-integration-hub/suppliers/:code/mappings", (req, res) => {
      const result = supplierIntegrationHub.upsertMapping(req.params.code, req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    });

    app.post("/api/supplier-integration-hub/suppliers/:code/sync", (req, res) => {
      const result = supplierIntegrationHub.queueSync(req.params.code, req.body || {});
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.status(202).json(result);
    });

    app.get("/api/supplier-integration-hub/sync-jobs", (req, res) => {
      return res.json(supplierIntegrationHub.listSyncJobs());
    });

    app.post("/api/supplier-integration-hub/suppliers/:code/snapshot", (req, res) => {
      const result = supplierIntegrationHub.addSnapshot(req.params.code, req.body || {});
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result);
    });

    app.post("/api/supplier-integration-hub/suppliers/:code/shipping-methods", (req, res) => {
      const result = supplierIntegrationHub.addShippingMethod(req.params.code, req.body || {});
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.status(201).json(result.method);
    });

    app.post("/api/supplier-integration-hub/orders", (req, res) => {
      const result = supplierIntegrationHub.createSupplierOrder(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(202).json(result);
    });

    app.get("/api/admin/supplier-integration-hub/overview", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(supplierIntegrationHub.getSupplierIntegrationHubOverview());
    });
  },
};
