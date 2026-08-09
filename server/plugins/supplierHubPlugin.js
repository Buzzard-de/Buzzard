const { extractToken, verifyToken } = require("../lib/dbAuth");
const { extractToken: extractAdminToken, getSession } = require("../lib/auth");
const supplierHub = require("../lib/supplierHub");

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

function requireAnyAuth(req, res) {
  const bearer = extractToken(req);
  if (bearer) {
    try {
      req.user = verifyToken(bearer);
      return req.user;
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

  res.status(401).json({ error: "Authentication required" });
  return null;
}

module.exports = {
  register(app) {
    if (!supplierHub.isEnabled()) {
      console.log("Supplier hub disabled (BUZZARD_SUPPLIER_HUB=0 or BUZZARD_DB_ENABLED=0)");
      return;
    }

    app.get("/api/admin/supplier-hub/suppliers", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(supplierHub.listSuppliers());
    });

    app.post("/api/admin/supplier-hub/suppliers", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = supplierHub.createSupplier(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(201).json(result.supplier);
    });

    app.patch("/api/admin/supplier-hub/suppliers/:id", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = supplierHub.updateSupplier(req.params.id, req.body || {});
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result.supplier);
    });

    app.get("/api/admin/supplier-hub/suppliers/:id/products", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(supplierHub.listSupplierProducts(req.params.id));
    });

    app.post("/api/admin/supplier-hub/suppliers/:id/sync", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = supplierHub.syncSupplierFeed(req.params.id, req.body || {});
      if (result.error) return res.status(result.status || 400).json(result);
      return res.json(result);
    });

    app.get("/api/admin/supplier-hub/sync-runs", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const limit = Math.min(Number(req.query?.limit) || 100, 200);
      return res.json(supplierHub.listSyncRuns(limit));
    });

    app.get("/api/admin/supplier-hub/margins", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(supplierHub.listMargins());
    });

    app.get("/api/vehicles", (req, res) => {
      return res.json(
        supplierHub.listVehicles({
          make: req.query?.make,
          model: req.query?.model,
        })
      );
    });

    app.post("/api/vehicles/seed", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(supplierHub.seedDemoVehicles());
    });

    app.post("/api/tecdoc/compatibility/link", (req, res) => {
      if (!requireAnyAuth(req, res)) return;
      const result = supplierHub.linkCompatibility(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    });

    app.get("/api/tecdoc/compatibility/vehicle/:vehicleId", (req, res) => {
      return res.json({
        vehicleId: Number(req.params.vehicleId),
        skus: supplierHub.listCompatibleSkusForVehicle(req.params.vehicleId),
      });
    });

    app.get("/api/tecdoc/compatibility/:sku", (req, res) => {
      return res.json(supplierHub.listCompatibilityForSku(req.params.sku));
    });
  },
};
