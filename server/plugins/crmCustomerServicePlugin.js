const { extractToken, verifyToken } = require("../lib/dbAuth");
const { extractToken: extractAdminToken, getSession } = require("../lib/auth");
const crmCustomerService = require("../lib/crmCustomerService");

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
    if (!crmCustomerService.isEnabled()) {
      console.log("CRM customer service disabled (BUZZARD_CRM_CUSTOMER_SERVICE=0 or BUZZARD_DB_ENABLED=0)");
      return;
    }

    app.post("/api/crm-customer-service/customers", (req, res) => {
      const result = crmCustomerService.createCustomer(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(201).json(result.customer);
    });

    app.get("/api/crm-customer-service/customers/:id", (req, res) => {
      const result = crmCustomerService.getCustomer(req.params.id);
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result);
    });

    app.post("/api/crm-customer-service/tickets", (req, res) => {
      const result = crmCustomerService.createTicket(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(201).json(result.ticket);
    });

    app.get("/api/crm-customer-service/tickets/:number", (req, res) => {
      const result = crmCustomerService.getTicket(req.params.number);
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result);
    });

    app.get("/api/admin/crm-customer-service/overview", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(crmCustomerService.getCrmOverview());
    });

    app.get("/api/admin/crm-customer-service/customers", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(crmCustomerService.listCustomers(req.query || {}));
    });

    app.patch("/api/admin/crm-customer-service/customers/:id", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = crmCustomerService.updateCustomer(req.params.id, req.body || {});
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result.customer);
    });

    app.post("/api/admin/crm-customer-service/customers/:id/tags", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = crmCustomerService.addCustomerTag(req.params.id, req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    });

    app.get("/api/admin/crm-customer-service/tickets", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(crmCustomerService.listTickets(req.query || {}));
    });

    app.patch("/api/admin/crm-customer-service/tickets/:id", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = crmCustomerService.updateTicket(req.params.id, req.body || {});
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result.ticket);
    });

    app.post("/api/admin/crm-customer-service/tickets/:id/messages", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      const result = crmCustomerService.addTicketMessage(req.params.id, req.body || {});
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result);
    });

    app.post("/api/admin/crm-customer-service/tickets/:id/notes", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(crmCustomerService.addTicketNote(req.params.id, req.body || {}));
    });
  },
};
