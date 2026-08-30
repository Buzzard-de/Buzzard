const { extractToken, verifyToken } = require("../lib/dbAuth");
const { extractToken: extractAdminToken, getSession } = require("../lib/auth");
const orderManagement = require("../lib/orderManagement");
const { assertCustomerMutationAllowed } = require("../lib/customer/customerMutationGuard");

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
    if (!orderManagement.isEnabled()) {
      console.log("Order management disabled (BUZZARD_ORDER_MANAGEMENT=0 or BUZZARD_DB_ENABLED=0)");
      return;
    }

    app.post("/api/order-management/orders", (req, res) => {
      const block = assertCustomerMutationAllowed({ req, action: "oms_order_create" });
      if (block?.blocked) {
        return res.status(block.status || 403).json({
          error: block.code,
          message: block.message,
          failClosed: true,
        });
      }
      const result = orderManagement.createOrder(req.body || {});
      if (result.error) {
        return res.status(result.status || 400).json({ error: result.error, detail: result.detail });
      }
      return res.status(result.created ? 201 : 200).json(result.order);
    });

    app.get("/api/order-management/orders/:orderNumber", (req, res) => {
      const result = orderManagement.getOrderByNumber(req.params.orderNumber);
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result);
    });

    app.get("/api/order-management/customer/:customerId/orders", (req, res) => {
      return res.json(orderManagement.listCustomerOrders(req.params.customerId));
    });

    app.get("/api/admin/order-management/overview", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(orderManagement.getOmsOverview());
    });

    app.get("/api/admin/order-management/orders", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(orderManagement.listOrders(req.query || {}));
    });

    app.patch("/api/admin/order-management/orders/:id/status", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = orderManagement.updateOrderStatus(req.params.id, req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result.order);
    });

    app.patch("/api/admin/order-management/orders/:id/payment", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = orderManagement.updatePaymentStatus(req.params.id, req.body || {});
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result.order);
    });

    app.patch("/api/admin/order-management/orders/:id/fulfillment", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = orderManagement.updateFulfillmentStatus(req.params.id, req.body || {});
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result.order);
    });

    app.post("/api/admin/order-management/orders/:id/cancel", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = orderManagement.cancelOrder(req.params.id, req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    });

    app.post("/api/admin/order-management/orders/:id/split", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = orderManagement.splitOrder(req.params.id, req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(201).json(result.order);
    });

    app.post("/api/admin/order-management/orders/:id/fulfillment-link", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = orderManagement.addFulfillmentLink(req.params.id, req.body || {});
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.status(201).json(result.link);
    });

    app.post("/api/admin/order-management/orders/:id/note", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = orderManagement.addOrderNote(req.params.id, req.body || {});
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result);
    });
  },
};
