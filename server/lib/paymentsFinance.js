const crypto = require("crypto");
const { db } = require("./db");

function isEnabled() {
  return process.env.BUZZARD_PAYMENTS_FINANCE !== "0" && process.env.BUZZARD_DB_ENABLED !== "0";
}

function uuid() {
  return crypto.randomUUID();
}

function audit(eventType, referenceId, metadata = {}) {
  db.prepare(`
    INSERT INTO finance_audit(event_type, reference_id, metadata_json)
    VALUES(?,?,?)
  `).run(eventType, String(referenceId || ""), JSON.stringify(metadata || {}));
}

function listPaymentMethods() {
  return db
    .prepare(`
      SELECT m.*, p.code AS provider, p.name AS provider_name
      FROM finance_payment_methods m
      JOIN finance_payment_providers p ON p.id = m.provider_id
      WHERE m.active = 1 AND p.enabled = 1
      ORDER BY p.name, m.name
    `)
    .all();
}

function createPaymentIntent(body = {}) {
  const orderNumber = String(body.orderNumber || body.order_number || "").trim();
  const amount = Number(body.amount || 0);
  if (!orderNumber || amount <= 0) {
    return { error: "orderNumber and positive amount required", status: 400, ok: false, captured: false, live: false };
  }
  return {
    ok: false,
    error: "PAYMENT_UNVERIFIED",
    code: "PAYMENT_UNVERIFIED",
    status: 409,
    intent: null,
    captured: false,
    paymentAuthorized: false,
    live: false,
    realMoneyMovement: false,
  };
}

function confirmPaymentIntent() {
  return {
    ok: false,
    error: "PAYMENT_UNVERIFIED",
    code: "PAYMENT_UNVERIFIED",
    status: 409,
    captured: false,
    paymentAuthorized: false,
    live: false,
    realMoneyMovement: false,
  };
}

function createRefund() {
  return {
    ok: false,
    error: "REFUND_UNVERIFIED",
    code: "REFUND_UNVERIFIED",
    status: 409,
    refunded: false,
    customerRefunded: false,
    supplierCredit: null,
    live: false,
    realMoneyMovement: false,
  };
}

function handlePaymentWebhook() {
  return {
    ok: false,
    error: "PAYMENT_UNVERIFIED",
    code: "PAYMENT_UNVERIFIED",
    status: 409,
    captured: false,
    live: false,
  };
}

function createInvoice() {
  return {
    ok: false,
    error: "INVOICE_UNVERIFIED",
    code: "INVOICE_UNVERIFIED",
    status: 409,
    issued: false,
    tax: null,
    live: false,
  };
}

function handlePayoutWebhook() {
  return {
    ok: false,
    error: "PAYOUT_UNVERIFIED",
    code: "PAYOUT_UNVERIFIED",
    status: 409,
    paid: false,
    live: false,
    realMoneyMovement: false,
  };
}

function handleDisputeWebhook() {
  return {
    ok: false,
    error: "DISPUTE_UNVERIFIED",
    code: "DISPUTE_UNVERIFIED",
    status: 409,
    recorded: false,
    live: false,
  };
}

function getFinanceOverview() {
  const revenue = db
    .prepare(`
      SELECT COALESCE(SUM(amount), 0) AS n
      FROM finance_payment_transactions
      WHERE type = 'capture' AND status = 'succeeded'
    `)
    .get().n;
  const refunds = db
    .prepare(`
      SELECT COALESCE(SUM(amount), 0) AS n
      FROM finance_refunds
      WHERE status = 'succeeded'
    `)
    .get().n;
  const invoices = db
    .prepare(`
      SELECT COALESCE(SUM(gross_amount), 0) AS n
      FROM finance_invoices
      WHERE status = 'issued'
    `)
    .get().n;
  const disputes = db
    .prepare(`
      SELECT COALESCE(SUM(amount), 0) AS n
      FROM finance_disputes
      WHERE status IN ('open', 'under_review')
    `)
    .get().n;
  const paymentCount = db.prepare("SELECT COUNT(*) n FROM finance_payment_intents").get().n;

  return {
    grossPayments: revenue,
    refunds,
    netPayments: revenue - refunds,
    invoicedGross: invoices,
    openDisputesAmount: disputes,
    paymentCount,
  };
}

function listPayments() {
  return db
    .prepare(`
      SELECT pi.*, p.code AS provider, m.name AS method_name
      FROM finance_payment_intents pi
      LEFT JOIN finance_payment_providers p ON p.id = pi.provider_id
      LEFT JOIN finance_payment_methods m ON m.id = pi.method_id
      ORDER BY pi.id DESC
      LIMIT 200
    `)
    .all();
}

function listRefunds() {
  return db.prepare("SELECT * FROM finance_refunds ORDER BY id DESC LIMIT 200").all();
}

function listInvoices() {
  return db.prepare("SELECT * FROM finance_invoices ORDER BY id DESC LIMIT 200").all();
}

function listPayouts() {
  return db
    .prepare(`
      SELECT p.*, pp.code AS provider
      FROM finance_payouts p
      LEFT JOIN finance_payment_providers pp ON pp.id = p.provider_id
      ORDER BY p.id DESC
      LIMIT 200
    `)
    .all();
}

function listDisputes() {
  return db
    .prepare(`
      SELECT d.*, pi.order_number
      FROM finance_disputes d
      LEFT JOIN finance_payment_intents pi ON pi.id = d.payment_intent_id
      ORDER BY d.id DESC
      LIMIT 200
    `)
    .all();
}

function listFinanceAudit() {
  return db.prepare("SELECT * FROM finance_audit ORDER BY id DESC LIMIT 200").all();
}

function getPaymentsFinanceStatus() {
  const overview = getFinanceOverview();
  return {
    version: "2.1.0",
    enabled: isEnabled(),
    providers: db.prepare("SELECT COUNT(*) n FROM finance_payment_providers").get().n,
    totals: {
      providers: db.prepare("SELECT COUNT(*) n FROM finance_payment_providers").get().n,
      enabledProviders: db
        .prepare("SELECT COUNT(*) n FROM finance_payment_providers WHERE enabled = 1")
        .get().n,
      paymentMethods: db
        .prepare("SELECT COUNT(*) n FROM finance_payment_methods WHERE active = 1")
        .get().n,
      paymentIntents: overview.paymentCount,
      refunds: db.prepare("SELECT COUNT(*) n FROM finance_refunds").get().n,
      invoices: db.prepare("SELECT COUNT(*) n FROM finance_invoices").get().n,
      payouts: db.prepare("SELECT COUNT(*) n FROM finance_payouts").get().n,
      disputes: db.prepare("SELECT COUNT(*) n FROM finance_disputes").get().n,
      auditEvents: db.prepare("SELECT COUNT(*) n FROM finance_audit").get().n,
    },
    overview,
  };
}

module.exports = {
  isEnabled,
  listPaymentMethods,
  createPaymentIntent,
  confirmPaymentIntent,
  createRefund,
  handlePaymentWebhook,
  createInvoice,
  handlePayoutWebhook,
  handleDisputeWebhook,
  getFinanceOverview,
  listPayments,
  listRefunds,
  listInvoices,
  listPayouts,
  listDisputes,
  listFinanceAudit,
  getPaymentsFinanceStatus,
};
