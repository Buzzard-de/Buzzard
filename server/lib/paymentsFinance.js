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
    return { error: "orderNumber and positive amount required", status: 400 };
  }

  const idempotencyKey = body.idempotencyKey || body.idempotency_key || uuid();
  const existing = db
    .prepare("SELECT * FROM finance_payment_intents WHERE idempotency_key = ?")
    .get(idempotencyKey);
  if (existing) return { intent: existing };

  const provider = db
    .prepare("SELECT * FROM finance_payment_providers WHERE code = ? AND enabled = 1")
    .get(body.provider || "stripe");
  if (!provider) return { error: "Payment provider unavailable", status: 400 };

  const method = db
    .prepare(`
      SELECT * FROM finance_payment_methods
      WHERE provider_id = ? AND code = ? AND active = 1
    `)
    .get(provider.id, body.method || "card");
  if (!method) return { error: "Payment method unavailable", status: 400 };

  const externalId = `pi_demo_${uuid().replace(/-/g, "")}`;
  const result = db
    .prepare(`
      INSERT INTO finance_payment_intents(
        order_number, provider_id, method_id, external_id, amount, currency, status, idempotency_key, customer_email
      )
      VALUES(?,?,?,?,?,?,?,?,?)
    `)
    .run(
      orderNumber,
      provider.id,
      method.id,
      externalId,
      amount,
      body.currency || "EUR",
      "requires_payment",
      idempotencyKey,
      body.customerEmail || body.customer_email || ""
    );

  audit("payment_intent_created", result.lastInsertRowid, {
    orderNumber,
    provider: provider.code,
  });
  const intent = db.prepare("SELECT * FROM finance_payment_intents WHERE id = ?").get(result.lastInsertRowid);
  return { intent };
}

function confirmPaymentIntent(id) {
  const intent = db.prepare("SELECT * FROM finance_payment_intents WHERE id = ?").get(id);
  if (!intent) return { error: "Payment intent not found", status: 404 };
  if (["succeeded", "refunded", "partially_refunded"].includes(intent.status)) {
    return { intent };
  }

  db.prepare(`
    UPDATE finance_payment_intents SET status = 'succeeded', updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(intent.id);
  db.prepare(`
    INSERT INTO finance_payment_transactions(
      payment_intent_id, type, amount, currency, external_id, status, metadata_json
    )
    VALUES(?,?,?,?,?,?,?)
  `).run(intent.id, "capture", intent.amount, intent.currency, intent.external_id, "succeeded", "{}");

  audit("payment_succeeded", intent.id, { amount: intent.amount, currency: intent.currency });
  return { intent: db.prepare("SELECT * FROM finance_payment_intents WHERE id = ?").get(intent.id) };
}

function createRefund(id, body = {}) {
  const intent = db.prepare("SELECT * FROM finance_payment_intents WHERE id = ?").get(id);
  if (!intent || intent.status !== "succeeded") {
    return { error: "Payment must be succeeded before refund", status: 400 };
  }

  const already = db
    .prepare(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM finance_refunds
      WHERE payment_intent_id = ? AND status IN ('pending', 'succeeded')
    `)
    .get(intent.id).total;
  const amount = Math.min(Number(body.amount || intent.amount - already), intent.amount - already);
  if (amount <= 0) return { error: "No refundable amount remaining", status: 400 };

  const result = db
    .prepare(`
      INSERT INTO finance_refunds(payment_intent_id, external_id, amount, currency, reason, status)
      VALUES(?,?,?,?,?,?)
    `)
    .run(
      intent.id,
      `re_${uuid().replace(/-/g, "")}`,
      amount,
      intent.currency,
      body.reason || "customer_request",
      "succeeded"
    );

  const total = already + amount;
  db.prepare(`
    UPDATE finance_payment_intents
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(total >= intent.amount ? "refunded" : "partially_refunded", intent.id);

  db.prepare(`
    INSERT INTO finance_payment_transactions(
      payment_intent_id, type, amount, currency, external_id, status, metadata_json
    )
    VALUES(?,?,?,?,?,?,?)
  `).run(
    intent.id,
    "refund",
    amount,
    intent.currency,
    `re_${result.lastInsertRowid}`,
    "succeeded",
    "{}"
  );

  audit("refund_succeeded", result.lastInsertRowid, { paymentIntentId: intent.id, amount });
  return { refund: db.prepare("SELECT * FROM finance_refunds WHERE id = ?").get(result.lastInsertRowid) };
}

function handlePaymentWebhook(body = {}) {
  const externalId = String(body.externalId || body.external_id || "").trim();
  const status = String(body.status || "").trim();
  if (!externalId || !status) return { error: "externalId and status required", status: 400 };

  const intent = db
    .prepare("SELECT * FROM finance_payment_intents WHERE external_id = ?")
    .get(externalId);
  if (!intent) return { error: "Payment intent not found", status: 404 };

  db.prepare(`
    UPDATE finance_payment_intents SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(status, intent.id);
  audit("provider_webhook", intent.id, { status });
  return { ok: true, status: 202 };
}

function createInvoice(body = {}) {
  const orderNumber = String(body.orderNumber || body.order_number || "").trim();
  const grossAmount = Number(body.grossAmount || body.gross_amount || 0);
  if (!orderNumber || grossAmount <= 0) return { error: "Invoice data missing", status: 400 };

  const invoiceNumber =
    body.invoiceNumber ||
    body.invoice_number ||
    `BUZ-${new Date().getFullYear()}-${String(Date.now()).slice(-8)}`;

  try {
    const result = db
      .prepare(`
        INSERT INTO finance_invoices(
          order_number, invoice_number, customer_email, net_amount, tax_amount, gross_amount, currency
        )
        VALUES(?,?,?,?,?,?,?)
      `)
      .run(
        orderNumber,
        invoiceNumber,
        body.customerEmail || body.customer_email || "",
        Number(body.netAmount || body.net_amount || 0),
        Number(body.taxAmount || body.tax_amount || 0),
        grossAmount,
        body.currency || "EUR"
      );
    audit("invoice_issued", result.lastInsertRowid, { invoiceNumber });
    return { invoice: db.prepare("SELECT * FROM finance_invoices WHERE id = ?").get(result.lastInsertRowid) };
  } catch {
    return { error: "Invoice/order already exists", status: 409 };
  }
}

function handlePayoutWebhook(body = {}) {
  const provider = db
    .prepare("SELECT id FROM finance_payment_providers WHERE code = ?")
    .get(body.provider);
  if (!provider) return { error: "Unknown provider", status: 400 };

  db.prepare(`
    INSERT INTO finance_payouts(provider_id, external_payout_id, amount, currency, status, payout_date)
    VALUES(?,?,?,?,?,?)
  `).run(
    provider.id,
    body.externalPayoutId || body.external_payout_id || uuid(),
    Number(body.amount || 0),
    body.currency || "EUR",
    body.status || "received",
    body.payoutDate || body.payout_date || new Date().toISOString()
  );
  return { ok: true, status: 202 };
}

function handleDisputeWebhook(body = {}) {
  const intent = db
    .prepare("SELECT * FROM finance_payment_intents WHERE external_id = ?")
    .get(body.externalId || body.external_id);
  if (!intent) return { error: "Payment not found", status: 404 };

  const result = db
    .prepare(`
      INSERT INTO finance_disputes(
        payment_intent_id, provider_code, external_case_id, amount, currency, status, reason
      )
      VALUES(?,?,?,?,?,?,?)
    `)
    .run(
      intent.id,
      body.provider || "",
      body.caseId || body.case_id || uuid(),
      Number(body.amount || 0),
      body.currency || intent.currency,
      body.status || "open",
      body.reason || ""
    );

  audit("dispute_received", result.lastInsertRowid, { paymentIntentId: intent.id });
  return { ok: true, status: 202 };
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
