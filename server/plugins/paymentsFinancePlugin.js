const { extractToken, verifyToken } = require("../lib/dbAuth");
const { extractToken: extractAdminToken, getSession } = require("../lib/auth");
const paymentsFinance = require("../lib/paymentsFinance");
const webhookGate = require("../lib/webhookGate");

function requireAnyAdmin(req, res) {
  if (req.adminUser) return req.adminUser;
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

  res.status(403).json({ error: "Admin access required", captured: false, realMoneyMovement: false });
  return null;
}

function financeError(res, result, fallback) {
  const body = { error: result.error, realMoneyMovement: false };
  if (result.code) body.code = result.code;
  if (result.captured === false) body.captured = false;
  if (result.refundIssued === false) body.refundIssued = false;
  return res.status(result.status || fallback).json(body);
}

function guardAdmin(handler) {
  return function adminGuarded(req, res) {
    if (!requireAnyAdmin(req, res)) return undefined;
    return handler(req, res);
  };
}

function guardWebhook(scope, handler) {
  return function signedWebhook(req, res) {
    if (req.webhook?.verified === true) return handler(req, res);
    const verdict = webhookGate.admit(req, scope);
    if (!verdict.ok) {
      res.status(verdict.status).json({ success: false, errorKey: verdict.errorKey, realMoneyMovement: false });
      return undefined;
    }
    if (verdict.duplicate) {
      res.status(200).json({ success: true, duplicate: true, realMoneyMovement: false });
      return undefined;
    }
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      webhookGate.settle(verdict.receiptId, res.statusCode || 0);
    };
    res.once("finish", settle);
    res.once("close", settle);
    return handler(req, res);
  };
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

    app.post("/api/payments-finance/intents", guardAdmin((req, res) => {
      const result = paymentsFinance.createPaymentIntent(req.body || {});
      if (result.error) return financeError(res, result, 400);
      return res.status(result.intent?.id ? 201 : 200).json(result.intent);
    }));

    app.post("/api/payments-finance/intents/:id/confirm", guardAdmin((req, res) => {
      const result = paymentsFinance.confirmPaymentIntent(req.params.id);
      if (result.error) {
        return res.status(result.status || 404).json({
          error: result.error,
          code: result.code,
          captured: result.captured === true,
          realMoneyMovement: result.realMoneyMovement === true,
        });
      }
      return res.json(result.intent);
    }));

    app.post("/api/payments-finance/intents/:id/refunds", guardAdmin((req, res) => {
      const result = paymentsFinance.createRefund(req.params.id, req.body || {});
      if (result.error) {
        return res.status(result.status || 400).json({
          error: result.error,
          code: result.code,
          refundIssued: result.refundIssued === true,
          realMoneyMovement: result.realMoneyMovement === true,
        });
      }
      return res.status(201).json(result.refund);
    }));

    app.post("/api/payments-finance/webhook", guardWebhook("payment", (req, res) => {
      const result = paymentsFinance.handlePaymentWebhook(req.body || {});
      if (result.error) return financeError(res, result, 400);
      return res.status(result.status || 202).json({ ok: result.ok, realMoneyMovement: false });
    }));

    app.post("/api/payments-finance/invoices", guardAdmin((req, res) => {
      const result = paymentsFinance.createInvoice(req.body || {});
      if (result.error) return financeError(res, result, 400);
      return res.status(201).json(result.invoice);
    }));

    app.post("/api/payments-finance/provider/payout-webhook", guardWebhook("payout", (req, res) => {
      const result = paymentsFinance.handlePayoutWebhook(req.body || {});
      if (result.error) return financeError(res, result, 400);
      return res.status(result.status || 202).json({ ok: result.ok, realMoneyMovement: false });
    }));

    app.post("/api/payments-finance/provider/dispute-webhook", guardWebhook("dispute", (req, res) => {
      const result = paymentsFinance.handleDisputeWebhook(req.body || {});
      if (result.error) return financeError(res, result, 404);
      return res.status(result.status || 202).json({ ok: result.ok, realMoneyMovement: false });
    }));

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
