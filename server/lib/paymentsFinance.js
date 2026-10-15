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
    return { error: "payment.amountRequired", status: 400 };
  }

  const idempotencyKey = body.idempotencyKey || body.idempotency_key || uuid();
  const existing = db
    .prepare("SELECT * FROM finance_payment_intents WHERE idempotency_key = ?")
    .get(idempotencyKey);
  if (existing) return { intent: existing };

  const provider = db
    .prepare("SELECT * FROM finance_payment_providers WHERE code = ? AND enabled = 1")
    .get(body.provider || "stripe");
  if (!provider) return { error: "payment.providerUnavailable", status: 400 };

  const method = db
    .prepare(`
      SELECT * FROM finance_payment_methods
      WHERE provider_id = ? AND code = ? AND active = 1
    `)
    .get(provider.id, body.method || "card");
  if (!method) return { error: "payment.methodUnavailable", status: 400 };

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
  if (!intent) return { error: "payment.intentNotFound", status: 404 };
  if (["succeeded", "refunded", "partially_refunded"].includes(intent.status)) {
    return { intent, applied: false, reason: "ALREADY_TERMINAL" };
  }

  audit("manual_confirm_rejected", intent.id, {
    applied: false,
    officialPath: "/api/commerce/webhooks/:provider",
  });
  return {
    error: "payment.confirmBlocked",
    status: 409,
    applied: false,
    reason: "PROVIDER_CONFIRMATION_REQUIRED",
    officialPath: "/api/commerce/webhooks/:provider",
    intentStatusUnchanged: intent.status,
  };
}

function createRefund(id, _body = {}) {
  const intent = db.prepare("SELECT * FROM finance_payment_intents WHERE id = ?").get(id);
  if (!intent) {
    return { error: "payment.intentNotFound", status: 404 };
  }

  audit("manual_refund_rejected", intent.id, {
    applied: false,
    financialEffect: false,
    officialPath: "/api/commerce/webhooks/:provider",
  });
  return {
    error: "payment.refundBlocked",
    status: 409,
    applied: false,
    financialEffect: false,
    reason: "PROVIDER_REFUND_REQUIRED",
    officialPath: "/api/commerce/webhooks/:provider",
  };
}

function handlePaymentWebhook(body = {}) {
  const externalId = String(body.externalId || body.external_id || "").trim();
  const claimedStatus = String(body.status || "").trim();
  if (!externalId || !claimedStatus) return { error: "payment.externalStatusRequired", status: 400 };

  const intent = db
    .prepare("SELECT * FROM finance_payment_intents WHERE external_id = ?")
    .get(externalId);
  if (!intent) return { error: "payment.intentNotFound", status: 404 };

  audit("unsigned_webhook_isolated", intent.id, {
    claimedStatus,
    applied: false,
    officialPath: "/api/commerce/webhooks/:provider",
  });
  return {
    ok: true,
    status: 202,
    accepted: true,
    applied: false,
    intentStatusUnchanged: intent.status,
    reason: "UNSIGNED_WEBHOOK_ISOLATED",
    officialPath: "/api/commerce/webhooks/:provider",
  };
}

function createInvoice(body = {}) {
  const orderNumber = String(body.orderNumber || body.order_number || "").trim();
  const grossAmount = Number(body.grossAmount || body.gross_amount || 0);
  if (!orderNumber || grossAmount <= 0) return { error: "invoice.dataMissing", status: 400 };

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
    return { error: "invoice.exists", status: 409 };
  }
}

function handlePayoutWebhook(body = {}) {
  const provider = db
    .prepare("SELECT id FROM finance_payment_providers WHERE code = ?")
    .get(body.provider);
  if (!provider) return { error: "payment.unknownProvider", status: 400 };

  audit("unsigned_payout_webhook_isolated", provider.id, {
    claimedExternalPayoutId: body.externalPayoutId || body.external_payout_id || null,
    claimedStatus: body.status || null,
    applied: false,
    financialEffect: false,
  });
  return {
    ok: true,
    status: 202,
    accepted: true,
    applied: false,
    financialEffect: false,
    reason: "UNSIGNED_WEBHOOK_ISOLATED",
  };
}

function handleDisputeWebhook(body = {}) {
  const intent = db
    .prepare("SELECT * FROM finance_payment_intents WHERE external_id = ?")
    .get(body.externalId || body.external_id);
  if (!intent) return { error: "payment.notFound", status: 404 };

  audit("unsigned_dispute_webhook_isolated", intent.id, {
    claimedCaseId: body.caseId || body.case_id || null,
    claimedStatus: body.status || null,
    applied: false,
    distinctFromRefund: true,
    distinctFromSupplierCredit: true,
  });
  return {
    ok: true,
    status: 202,
    accepted: true,
    applied: false,
    reason: "UNSIGNED_WEBHOOK_ISOLATED",
    distinctFromRefund: true,
    distinctFromSupplierCredit: true,
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
