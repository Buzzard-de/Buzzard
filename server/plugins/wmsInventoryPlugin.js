const { extractToken, verifyToken } = require("../lib/dbAuth");
const { extractToken: extractAdminToken, getSession } = require("../lib/auth");
const wmsInventory = require("../lib/wmsInventory");

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
    if (!wmsInventory.isEnabled()) {
      console.log("WMS inventory disabled (BUZZARD_WMS_INVENTORY=0 or BUZZARD_DB_ENABLED=0)");
      return;
    }

    app.get("/api/admin/wms-inventory/warehouses", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(wmsInventory.listWarehouses());
    });

    app.post("/api/admin/wms-inventory/warehouses", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = wmsInventory.createWarehouse(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(201).json(result.warehouse);
    });

    app.post("/api/admin/wms-inventory/locations", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = wmsInventory.createLocation(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    });

    app.get("/api/admin/wms-inventory/inventory", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(wmsInventory.listInventory());
    });

    app.post("/api/admin/wms-inventory/inventory/movement", (req, res) => {
      const user = requireAnyAdmin(req, res);
      if (!user) return;
      const userId = user.sub || user.id;
      const result = wmsInventory.recordMovement(req.body || {}, userId);
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result.inventory);
    });

    app.post("/api/admin/wms-inventory/inventory/reserve", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = wmsInventory.reserveInventory(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(201).json(result.reservation);
    });

    app.post("/api/wms-inventory/scan", (req, res) => {
      if (!requireAnyAuth(req, res)) return;
      const result = wmsInventory.scanBarcode(String(req.body?.barcode || "").trim());
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result.item);
    });

    app.get("/api/admin/wms-inventory/jobs", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(wmsInventory.listWarehouseJobs());
    });

    app.post("/api/admin/wms-inventory/jobs", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = wmsInventory.createWarehouseJob(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(201).json(result.job);
    });

    app.post("/api/admin/wms-inventory/transfers", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = wmsInventory.createTransfer(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(201).json(result.transfer);
    });

    app.post("/api/admin/wms-inventory/stocktakes", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = wmsInventory.createStocktake(req.body || {});
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result.stocktake);
    });

    app.get("/api/admin/wms-inventory/low-stock", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(wmsInventory.listLowStock());
    });

    app.get("/api/admin/wms-inventory/movements", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(wmsInventory.listMovements());
    });
  },
};
