const { extractToken, verifyToken } = require("../lib/dbAuth");
const { extractToken: extractAdminToken, getSession } = require("../lib/auth");
const orderAutomation = require("../lib/orderAutomation");

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
      /* try JSON admin session next */
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
    if (!orderAutomation.isEnabled()) {
      console.log("Order automation disabled (BUZZARD_ORDER_AUTOMATION=0 or BUZZARD_DB_ENABLED=0)");
      return;
    }

    app.get("/api/admin/automation-status", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(orderAutomation.getAutomationStatus());
    });

    app.post("/api/automation/order-created", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const { orderNumber } = req.body || {};
      if (!orderNumber) return res.status(400).json({ error: "orderNumber required" });
      const result = orderAutomation.queueOrderCreated(orderNumber);
      if (!result.ok) return res.status(400).json(result);
      return res.status(202).json(result);
    });

    app.post("/api/webhooks/payment", (req, res) => {
      const result = orderAutomation.handlePaymentWebhook(req.body || {});
      if (!result.ok) return res.status(result.status || 400).json(result);
      return res.json(result);
    });

    app.post("/api/admin/shipment-created", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const { orderNumber, carrier, trackingNumber } = req.body || {};
      if (!orderNumber) return res.status(400).json({ error: "orderNumber required" });
      return res.json(orderAutomation.recordShipmentCreated({ orderNumber, carrier, trackingNumber }));
    });

    app.post("/api/admin/supplier-result", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const { orderNumber, supplier, status, supplierOrderId } = req.body || {};
      if (!orderNumber) return res.status(400).json({ error: "orderNumber required" });
      return res.json(
        orderAutomation.recordSupplierResult({ orderNumber, supplier, status, supplierOrderId })
      );
    });

    app.post("/api/admin/jobs/:id/retry", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = orderAutomation.retryJob(Number(req.params.id));
      if (!result.ok) return res.status(result.status || 400).json(result);
      return res.json(result);
    });

    app.get("/api/admin/jobs", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const limit = Math.min(Number(req.query?.limit) || 200, 500);
      return res.json(orderAutomation.listJobs(limit));
    });

    app.get("/api/admin/events", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const limit = Math.min(Number(req.query?.limit) || 200, 500);
      return res.json(orderAutomation.listIntegrationEvents(limit));
    });

    app.get("/api/admin/order-flow/:orderNumber", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(orderAutomation.getOrderFlowDetail(req.params.orderNumber));
    });
  },
};
