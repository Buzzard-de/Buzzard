const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const { requireCustomer } = require("../lib/customerAuth");

function attachAdmin(req, res) {
  const session = requireAuth(req, res);
  if (!session) return null;
  req.adminUser = {
    userId: session.userId,
    id: session.userId,
    email: session.email,
    name: session.name,
    role: session.role,
  };
  return session;
}

module.exports = {
  register(app) {
    app.get("/api/health/software", async (_req, res) => {
      const software = require("../lib/software");
      const pusat = require("../lib/pusat");
      const body = software.health(await pusat.getHealth());
      res.json({ success: true, liveReady: false, ...body });
    });

    app.get("/api/admin/software/health", async (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "ai.read")) return;
      const software = require("../lib/software");
      const pusat = require("../lib/pusat");
      res.json({ success: true, ...(software.health(await pusat.getHealth())) });
    });

    app.get("/api/admin/software/canonical", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "ai.read")) return;
      const software = require("../lib/software");
      res.json({ success: true, ...software.canonical.getCanonicalMap() });
    });

    app.get("/api/admin/software/marketplace", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "ai.read")) return;
      const software = require("../lib/software");
      res.json({ success: true, connectors: software.marketplace.classifyConnectors() });
    });

    app.get("/api/customer/tracking/:orderId", (req, res) => {
      const session = requireCustomer(req, res);
      if (!session) return;
      const software = require("../lib/software");
      const { db } = require("../lib/db");
      const result = software.tracking.getForCustomer(db, {
        orderId: req.params.orderId,
        customerId: session.customerId,
      });
      if (result.denied || !result.ok) {
        res.status(result.denied ? 403 : 404).json({ success: false, error: result.denied ? "access_denied" : "not_found" });
        return;
      }
      res.json({ success: true, shipment: result.shipment });
    });
  },
};
