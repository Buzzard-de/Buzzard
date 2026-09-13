/**
 * Fulfillment Control Tower — operational reconciliation admin API.
 * Read-only detect/classify/reconcile/escalate/audit — no auto-remediation.
 */
const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");

let tower = null;

function loadTower() {
  if (tower) return tower;
  try {
    tower = require("../lib/fulfillmentControlTower.bundle.cjs");
    tower.hydrateControlTowerFromPersistence?.();
    return tower;
  } catch (err) {
    console.warn("Fulfillment control tower bundle unavailable:", err.message);
    return null;
  }
}

function attachAdmin(req, res) {
  const session = requireAuth(req, res);
  if (!session) return null;
  req.adminUser = {
    userId: session.userId,
    id: session.userId,
    email: session.email,
    role: session.role,
  };
  return session;
}

module.exports = {
  register(app) {
    if (process.env.BUZZARD_FULFILLMENT_CONTROL_TOWER === "0") {
      console.log("Fulfillment control tower API disabled (BUZZARD_FULFILLMENT_CONTROL_TOWER=0)");
      return;
    }

    app.get("/api/admin/fulfillment-control-tower/dashboard", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "fulfillment.read")) return;
      const mod = loadTower();
      if (!mod) return res.status(503).json({ success: false, errorCode: "TOWER_UNAVAILABLE" });
      const filter = {
        supplierId: req.query.supplierId ? String(req.query.supplierId) : undefined,
        orderId: req.query.orderId ? String(req.query.orderId) : undefined,
        marketplaceId: req.query.marketplaceId ? String(req.query.marketplaceId) : undefined,
      };
      return res.json({
        success: true,
        data: mod.getFulfillmentControlTowerDashboard(filter),
        source: "fulfillment-control-tower",
      });
    });

    app.get("/api/admin/fulfillment-control-tower/fulfillments", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "fulfillment.read")) return;
      const mod = loadTower();
      if (!mod) return res.status(503).json({ success: false, errorCode: "TOWER_UNAVAILABLE" });
      const rows = mod.listFulfillmentControlTowerRows({
        supplierId: req.query.supplierId ? String(req.query.supplierId) : undefined,
        orderId: req.query.orderId ? String(req.query.orderId) : undefined,
        status: req.query.status ? String(req.query.status) : undefined,
        marketplaceId: req.query.marketplaceId ? String(req.query.marketplaceId) : undefined,
      });
      return res.json({ success: true, data: rows, source: "fulfillment-control-tower" });
    });

    app.get("/api/admin/fulfillment-control-tower/fulfillments/:fulfillmentId", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "fulfillment.read")) return;
      const mod = loadTower();
      if (!mod) return res.status(503).json({ success: false, errorCode: "TOWER_UNAVAILABLE" });
      const detail = mod.getFulfillmentControlTowerDetail(req.params.fulfillmentId);
      if (!detail) return res.status(404).json({ success: false, errorCode: "FULFILLMENT_NOT_FOUND" });
      return res.json({ success: true, data: detail, source: "fulfillment-control-tower" });
    });

    app.post("/api/admin/fulfillment-control-tower/reconcile", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "fulfillment.reconcile")) return;
      const mod = loadTower();
      if (!mod) return res.status(503).json({ success: false, errorCode: "TOWER_UNAVAILABLE" });
      if (mod.isSupplierOrderNetworkEnabled?.()) {
        return res.status(403).json({ success: false, errorCode: "SUPPLIER_ORDER_NETWORK_ENABLED" });
      }
      const result = mod.runFulfillmentReconciliation({
        filter: req.body?.filter,
        correlationId: req.body?.correlationId,
        fulfillmentIds: req.body?.fulfillmentIds,
      });
      return res.json({ success: true, data: result, source: "fulfillment-control-tower" });
    });

    app.get("/api/admin/fulfillment-control-tower/incidents", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "fulfillment.incident.read")) return;
      const mod = loadTower();
      if (!mod) return res.status(503).json({ success: false, errorCode: "TOWER_UNAVAILABLE" });
      const incidents = mod.filterIncidents({
        supplierId: req.query.supplierId ? String(req.query.supplierId) : undefined,
        orderId: req.query.orderId ? String(req.query.orderId) : undefined,
        severity: req.query.severity ? String(req.query.severity) : undefined,
        category: req.query.category ? String(req.query.category) : undefined,
        status: req.query.status ? String(req.query.status) : undefined,
      });
      return res.json({ success: true, data: incidents, source: "fulfillment-control-tower" });
    });

    app.post("/api/admin/fulfillment-control-tower/incidents/:incidentId/acknowledge", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "fulfillment.incident.resolve")) return;
      const mod = loadTower();
      if (!mod) return res.status(503).json({ success: false, errorCode: "TOWER_UNAVAILABLE" });
      const updated = mod.acknowledgeIncident(
        req.params.incidentId,
        req.adminUser?.email || req.adminUser?.userId || "admin"
      );
      if (!updated) return res.status(404).json({ success: false, errorCode: "INCIDENT_NOT_FOUND" });
      return res.json({ success: true, data: updated, source: "fulfillment-control-tower" });
    });

    app.post("/api/admin/fulfillment-control-tower/incidents/:incidentId/resolve", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "fulfillment.incident.resolve")) return;
      const mod = loadTower();
      if (!mod) return res.status(503).json({ success: false, errorCode: "TOWER_UNAVAILABLE" });
      const updated = mod.resolveIncident(
        req.params.incidentId,
        req.adminUser?.email || req.adminUser?.userId || "admin",
        req.body?.note
      );
      if (!updated) return res.status(404).json({ success: false, errorCode: "INCIDENT_NOT_FOUND" });
      return res.json({ success: true, data: updated, source: "fulfillment-control-tower" });
    });

    app.get("/api/admin/fulfillment-control-tower/analytics", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "fulfillment.read")) return;
      const mod = loadTower();
      if (!mod) return res.status(503).json({ success: false, errorCode: "TOWER_UNAVAILABLE" });
      return res.json({
        success: true,
        data: mod.getFulfillmentControlTowerAnalyticsSummary(),
        source: "fulfillment-control-tower",
      });
    });
  },
};
