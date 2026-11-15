const { extractToken, verifyToken } = require("../lib/dbAuth");
const { extractToken: extractAdminToken, getSession } = require("../lib/auth");
const customerSupport = require("../lib/customerSupport");

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

function requireCustomer(req, res) {
  const bearer = extractToken(req);
  if (!bearer) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  try {
    req.user = verifyToken(bearer);
    return req.user;
  } catch {
    res.status(401).json({ error: "Invalid token" });
    return null;
  }
}

module.exports = {
  register(app) {
    if (!customerSupport.isEnabled()) {
      console.log("Customer support disabled (BUZZARD_CUSTOMER_SUPPORT=0 or BUZZARD_DB_ENABLED=0)");
      return;
    }

    app.post("/api/customer/support/tickets", (req, res) => {
      if (!requireCustomer(req, res)) return;
      const result = customerSupport.createTicket(req.user.sub, req.body || {});
      return res.status(result.status || 200).json({ ...result, ok: false, sent: false, customerNotified: false, delivery: "BLOCKED_EXTERNAL" });
    });

    app.get("/api/customer/support/tickets", (req, res) => {
      if (!requireCustomer(req, res)) return;
      return res.json(customerSupport.listUserTickets(req.user.sub));
    });

    app.get("/api/customer/support/tickets/:id", (req, res) => {
      if (!requireCustomer(req, res)) return;
      const result = customerSupport.getUserTicket(req.user.sub, req.params.id);
      if (!result) return res.status(404).json({ error: "Ticket not found" });
      return res.json(result);
    });

    app.post("/api/customer/support/tickets/:id/messages", (req, res) => {
      if (!requireCustomer(req, res)) return;
      const result = customerSupport.addCustomerMessage(
        req.user.sub,
        req.params.id,
        req.body?.message
      );
      return res.status(result.status || 200).json({ ...result, ok: false, sent: false, customerNotified: false, delivery: "BLOCKED_EXTERNAL" });
    });

    app.get("/api/customer/orders/:orderNumber/tracking", (req, res) => {
      if (!requireCustomer(req, res)) return;
      const result = customerSupport.listOrderTracking(req.params.orderNumber, req.user.sub);
      return res.status(result.status || 404).json({ ...result, events: [], delivered: false, customerNotified: false });
    });

    app.get("/api/admin/customer-support/status", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(customerSupport.getCustomerSupportStatus());
    });

    app.get("/api/admin/customer-support/tickets", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(customerSupport.listTicketsAdmin());
    });

    app.get("/api/admin/customer-support/tickets/:id", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = customerSupport.getTicketAdmin(req.params.id);
      if (!result) return res.status(404).json({ error: "Ticket not found" });
      return res.json(result);
    });

    app.post("/api/admin/customer-support/tickets/:id/reply", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const adminId = req.user?.sub || 0;
      const result = customerSupport.replyTicketAdmin(adminId, req.params.id, req.body?.message);
      return res.status(result.status || 403).json({ ...result, ok: false, customerNotified: false, sent: false });
    });

    app.patch("/api/admin/customer-support/tickets/:id", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = customerSupport.updateTicketAdmin(req.params.id, req.body || {});
      return res.status(result.status || 409).json({ ...result, ok: false, stored: false, customerNotified: false });
    });

    app.post("/api/admin/customer-support/tracking-event", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = customerSupport.createTrackingEvent(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    });

    app.post("/api/admin/customer-support/notifications/email", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = customerSupport.queueEmailNotification(req.body || {});
      return res.status(result.status || 409).json({ ...result, ok: false, sent: false, queued: false, customerNotified: false });
    });

    app.post("/api/admin/customer-support/notifications/whatsapp", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = customerSupport.queueWhatsAppNotification(req.body || {});
      return res.status(result.status || 409).json({ ...result, ok: false, sent: false, queued: false, customerNotified: false });
    });

    app.get("/api/admin/customer-support/templates", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(customerSupport.listSupportTemplates());
    });
  },
};
