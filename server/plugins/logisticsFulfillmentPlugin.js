const { extractToken, verifyToken } = require("../lib/dbAuth");
const { extractToken: extractAdminToken, getSession } = require("../lib/auth");
const logisticsFulfillment = require("../lib/logisticsFulfillment");

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
    if (!logisticsFulfillment.isEnabled()) {
      console.log(
        "Logistics fulfillment disabled (BUZZARD_LOGISTICS_FULFILLMENT=0 or BUZZARD_DB_ENABLED=0)"
      );
      return;
    }

    app.get("/api/logistics-fulfillment/shipping/options/:country", (req, res) => {
      return res.json(logisticsFulfillment.listShippingOptions(req.params.country));
    });

    app.post("/api/admin/logistics-fulfillment/shipments/quote", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = logisticsFulfillment.quoteShipment(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result.quote);
    });

    app.post("/api/admin/logistics-fulfillment/shipments", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = logisticsFulfillment.createShipment(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(201).json(result.shipment);
    });

    app.post("/api/admin/logistics-fulfillment/shipments/:id/label-result", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = logisticsFulfillment.updateLabelResult(req.params.id, req.body || {});
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result.shipment);
    });

    app.get("/api/admin/logistics-fulfillment/shipments", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(logisticsFulfillment.listShipments());
    });

    app.get("/api/admin/logistics-fulfillment/carriers", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(logisticsFulfillment.listCarriers());
    });

    app.get("/api/logistics-fulfillment/shipments/:orderNumber/tracking", (req, res) => {
      if (!requireAnyAuth(req, res)) return;
      const result = logisticsFulfillment.getShipmentTracking(req.params.orderNumber);
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result.tracking);
    });

    app.post("/api/logistics-fulfillment/carrier/webhook", (req, res) => {
      const result = logisticsFulfillment.handleCarrierWebhook(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(result.status || 202).json({ ok: result.ok });
    });

    app.post("/api/logistics-fulfillment/returns", (req, res) => {
      const user = requireAnyAuth(req, res);
      if (!user) return;
      const customerId = user.sub || user.customerId;
      if (!customerId) return res.status(400).json({ error: "Customer id required" });
      const result = logisticsFulfillment.createReturn(req.body || {}, customerId);
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(201).json(result.returnRequest);
    });

    app.get("/api/logistics-fulfillment/returns", (req, res) => {
      const user = requireAnyAuth(req, res);
      if (!user) return;
      const customerId = user.sub || user.customerId;
      if (!customerId) return res.status(400).json({ error: "Customer id required" });
      return res.json(logisticsFulfillment.listCustomerReturns(customerId));
    });

    app.get("/api/admin/logistics-fulfillment/returns", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(logisticsFulfillment.listAdminReturns());
    });

    app.patch("/api/admin/logistics-fulfillment/returns/:id", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = logisticsFulfillment.updateReturn(req.params.id, req.body || {});
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result.returnRequest);
    });

    app.get("/api/admin/logistics-fulfillment/jobs", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(logisticsFulfillment.listFulfillmentJobs());
    });
  },
};
