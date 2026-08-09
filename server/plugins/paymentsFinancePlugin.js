const { extractToken, verifyToken } = require("../lib/dbAuth");
const { extractToken: extractAdminToken, getSession } = require("../lib/auth");
const paymentsFinance = require("../lib/paymentsFinance");

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
    if (!paymentsFinance.isEnabled()) {
      console.log("Payments finance disabled (BUZZARD_PAYMENTS_FINANCE=0 or BUZZARD_DB_ENABLED=0)");
      return;
    }

    app.get("/api/payments-finance/methods", (_req, res) => {
      return res.json(paymentsFinance.listPaymentMethods());
    });

    app.post("/api/payments-finance/intents", (req, res) => {
      const result = paymentsFinance.createPaymentIntent(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(result.intent?.id ? 201 : 200).json(result.intent);
    });

    app.post("/api/payments-finance/intents/:id/confirm", (req, res) => {
      const result = paymentsFinance.confirmPaymentIntent(req.params.id);
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result.intent);
    });

    app.post("/api/payments-finance/intents/:id/refunds", (req, res) => {
      const result = paymentsFinance.createRefund(req.params.id, req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(201).json(result.refund);
    });

    app.post("/api/payments-finance/webhook", (req, res) => {
      const result = paymentsFinance.handlePaymentWebhook(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(result.status || 202).json({ ok: result.ok });
    });

    app.post("/api/payments-finance/invoices", (req, res) => {
      const result = paymentsFinance.createInvoice(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(201).json(result.invoice);
    });

    app.post("/api/payments-finance/provider/payout-webhook", (req, res) => {
      const result = paymentsFinance.handlePayoutWebhook(req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(result.status || 202).json({ ok: result.ok });
    });

    app.post("/api/payments-finance/provider/dispute-webhook", (req, res) => {
      const result = paymentsFinance.handleDisputeWebhook(req.body || {});
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.status(result.status || 202).json({ ok: result.ok });
    });

    app.get("/api/admin/payments-finance/overview", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(paymentsFinance.getFinanceOverview());
    });

    app.get("/api/admin/payments-finance/payments", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(paymentsFinance.listPayments());
    });

    app.get("/api/admin/payments-finance/refunds", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(paymentsFinance.listRefunds());
    });

    app.get("/api/admin/payments-finance/invoices", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(paymentsFinance.listInvoices());
    });

    app.get("/api/admin/payments-finance/payouts", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(paymentsFinance.listPayouts());
    });

    app.get("/api/admin/payments-finance/disputes", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(paymentsFinance.listDisputes());
    });

    app.get("/api/admin/payments-finance/audit", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(paymentsFinance.listFinanceAudit());
    });
  },
};
