/**
 * Isolated synthetic order lifecycle. One orderId through 11 engines.
 * Not live commerce. Dropshipping: no stock buy without order + human gate.
 */
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createRequire } = require("module");
const { calculate, applyCustomerRefund, MIN_NET } = require("../finance/unifiedPricing");
const { buyStock } = require("./engineRegistry");
const { paymentStatus, initiateTransfer } = require("../finance/bankingAdapter");
const { getAdapter } = require("../logistics/carrierContract");
const { screen } = require("../compliance/sanctionsAdapter");
const { split } = require("../finance/taxReserves");
const { draftEmail } = require("../customer/banuDesk");
const { assertNotGuardian } = require("../pusat/durableTaskQueue");

function loadSqlite() {
  const root = path.join(__dirname, "..", "..", "..");
  try {
    return createRequire(path.join(root, "server", "package.json"))("better-sqlite3");
  } catch {
    return require("better-sqlite3");
  }
}

function createStore({ dbPath } = {}) {
  const resolved = dbPath || path.join(os.tmpdir(), `buzzard-iso-${crypto.randomBytes(4).toString("hex")}.sqlite`);
  assertNotGuardian(resolved);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const Database = loadSqlite();
  const db = new Database(resolved);
  db.pragma("busy_timeout = 8000");
  db.exec(`
    CREATE TABLE IF NOT EXISTS iso_orders (
      order_id TEXT PRIMARY KEY,
      product_id TEXT,
      supplier_id TEXT,
      customer_id TEXT,
      scenario TEXT,
      live INTEGER NOT NULL,
      payment_json TEXT,
      shipment_json TEXT,
      refund_json TEXT,
      receivable_json TEXT,
      ledger_json TEXT,
      body_json TEXT NOT NULL,
      idempotency_key TEXT UNIQUE,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS iso_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      event TEXT NOT NULL,
      at TEXT NOT NULL
    );
  `);

  function put(order) {
    const now = new Date().toISOString();
    const write = db.transaction(() => {
      db.prepare(
        `INSERT INTO iso_orders (
           order_id, product_id, supplier_id, customer_id, scenario, live,
           payment_json, shipment_json, refund_json, receivable_json, ledger_json,
           body_json, idempotency_key, updated_at
         ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
         ON CONFLICT(order_id) DO UPDATE SET
           product_id = excluded.product_id,
           supplier_id = excluded.supplier_id,
           customer_id = excluded.customer_id,
           scenario = excluded.scenario,
           live = excluded.live,
           payment_json = excluded.payment_json,
           shipment_json = excluded.shipment_json,
           refund_json = excluded.refund_json,
           receivable_json = excluded.receivable_json,
           ledger_json = excluded.ledger_json,
           body_json = excluded.body_json,
           updated_at = excluded.updated_at`
      ).run(
        order.orderId,
        order.productId || null,
        order.supplierId || null,
        order.customerId || null,
        order.scenario || null,
        order.live ? 1 : 0,
        JSON.stringify(order.stages?.payment || null),
        JSON.stringify(order.stages?.fulfillment || order.stages?.shipping || null),
        JSON.stringify(order.stages?.refunds || null),
        JSON.stringify(order.stages?.supplierReceivable || null),
        JSON.stringify(order.ledger || []),
        JSON.stringify(order),
        order.orderId,
        now
      );
      db.prepare(`INSERT INTO iso_audit (order_id, event, at) VALUES (?,?,?)`).run(order.orderId, "PUT", now);
    });
    write();
    return order;
  }

  function get(id) {
    const row = db.prepare(`SELECT body_json FROM iso_orders WHERE order_id = ?`).get(id);
    return row ? JSON.parse(row.body_json) : null;
  }

  function close() {
    db.close();
  }

  return { put, get, close, dbPath: resolved, durable: true, inMemory: false };
}

function baseOrder({ orderId, scenario }) {
  return {
    orderId,
    productId: "SYN-PAD",
    supplierId: "SYN-SUP",
    customerId: "SYN-CUST",
    scenario,
    live: false,
    stages: {},
    events: [],
    ledger: [],
    history: [],
  };
}

function post(order, kind, amount, note) {
  order.ledger.push({ kind, amount: Number(amount), note, assumedSupplierCredit: false });
}

function ledgerOk(order) {
  const credits = order.ledger.filter((r) => r.kind === "SUPPLIER_CREDIT").reduce((s, r) => s + r.amount, 0);
  return credits === 0;
}

function runIsolatedOrder({ scenario = "happy", store = createStore(), orderId } = {}) {
  const id = orderId || `SYN-${crypto.randomBytes(4).toString("hex")}`;
  if (scenario === "duplicate_order") {
    const first = runIsolatedOrder({ scenario: "happy", store, orderId: id || "SYN-DUP" });
    const stored = store.get(first.orderId) || first;
    stored.events = [{ ok: true, orderId: first.orderId, live: false }, { ok: false, code: "DUPLICATE_ORDER", moneyMoved: false }];
    stored.scenario = "duplicate_order";
    stored.duplicate = true;
    stored.live = false;
    return store.put(stored);
  }

  const order = baseOrder({ orderId: id, scenario });
  order.stages.product = { sku: "SYN-PAD", name: "Synthetic pad", live: false };
  order.stages.normalization = { canonical: "brake_pad", ok: true };
  order.stages.category = { code: "bz.01", matched: true };
  order.stages.supplier = { id: "SYN-SUP", selected: scenario !== "supplier_unavailable" };
  if (scenario === "supplier_unavailable") {
    order.events.push({ step: "supplier", ok: false, code: "SUPPLIER_UNAVAILABLE" });
    return store.put(order);
  }
  order.stages.inventory = { qty: scenario === "stock_change" ? 0 : 1, warehouse: false };
  const buy = buyStock();
  order.stages.inventory.buy = buy.code;
  if (scenario === "stock_change") {
    order.events.push({ step: "stock", qty: 0, buy: buy.code });
    return store.put(order);
  }
  const price = calculate({
    actorId: "pricing_ai",
    supplierCost: scenario === "insufficient_profit" ? 9.8 : 40,
    shipping: scenario === "insufficient_profit" ? 0.1 : 6,
    marketplaceCommission: scenario === "insufficient_profit" ? 0.1 : 4,
    vat: scenario === "insufficient_profit" ? 0 : 10,
    returnReserve: 0,
    paymentFees: 0,
    category: "automotive",
    marketPrice: scenario === "insufficient_profit" ? 10 : undefined,
  });
  order.stages.pricing = price;
  if (scenario === "insufficient_profit") {
    order.events.push({ step: "profit", quote: price, minNet: MIN_NET });
    return store.put(order);
  }
  order.stages.order = { status: "CREATED", live: false };
  let pay = paymentStatus({ from: "CREATED", event: scenario === "failed_payment" ? "fail" : "authorize" });
  if (pay.ok && scenario !== "failed_payment") {
    pay = paymentStatus({ from: pay.to, event: "capture" });
  }
  const transfer = initiateTransfer();
  order.stages.payment = { ...pay, sent: transfer.sent, moneyMoved: false };
  if (scenario === "failed_payment") {
    order.events.push({ step: "payment", sent: false, code: pay.to || pay.code, moneyMoved: false });
    return store.put(order);
  }
  if (scenario === "timeout") {
    order.events.push({ step: "timeout", code: "ISOLATED_TIMEOUT", reachedNetwork: false });
    return store.put(order);
  }
  order.stages.supplierPo = { poId: `PO-${id}`, transmitted: false, live: false };
  const carrier = getAdapter("DHL");
  const shipment = carrier.createShipment({ orderId: id });
  order.stages.fulfillment = { ...shipment, liveShipment: false };
  order.stages.shipping = { carrier: "DHL", label: carrier.createLabel({ orderId: id }) };
  let trackStatus = "IN_TRANSIT";
  if (scenario === "shipment_delay") trackStatus = "DELAYED";
  if (scenario === "cargo_loss") trackStatus = "LOST";
  if (scenario === "partial_delivery") trackStatus = "DELIVERED";
  order.stages.tracking = carrier.trackShipment({ status: trackStatus });
  if (scenario === "cargo_loss") {
    order.events.push({ step: "carrier", status: "LOST", liveShipment: false, claim: "HUMAN_GATE_REQUIRED" });
    return store.put(order);
  }
  if (scenario === "partial_delivery") {
    order.events.push({ step: "delivery", qtyOrdered: 2, qtyDelivered: 1, live: false });
    return store.put(order);
  }
  if (scenario === "customer_cancel") {
    order.stages.order.status = "CANCELLED";
    order.events.push({ step: "cancel", code: "HUMAN_GATE_REQUIRED", sent: false });
    return store.put(order);
  }
  const note = draftEmail({ locale: "de", intent: "order_status", facts: { orderId: id } });
  order.stages.notify = { sent: note.sent === true, channel: "email_draft" };
  order.stages.returns = { opened: scenario.includes("refund"), live: false };
  if (scenario === "partial_refund") {
    const after = applyCustomerRefund({
      estimatedProfit: 12,
      refund: 3,
      orderId: id,
      customerId: order.customerId,
    });
    order.stages.refunds = after;
    order.actualProfit = after.actualProfit;
    order.stages.supplierReceivable = { amount: null, assumed: false, verified: false };
    order.events.push({ step: "refund", refunded: after.refunded, code: after.code });
  } else if (scenario === "supplier_refuses_reimbursement") {
    const refused = applyCustomerRefund({
      estimatedProfit: 12,
      orderId: id,
      customerId: order.customerId,
      supplierReimbursement: null,
    });
    order.stages.refunds = refused;
    order.stages.supplierReceivable = { amount: null, assumed: false, verified: false };
    order.events.push({ step: "supplier_credit", assumed: false, amount: null, verified: false });
  } else if (scenario === "financial_mismatch") {
    post(order, "SUPPLIER_CREDIT", 5, "assumed");
  }
  const sanctions = screen({ origin: "DE", destination: "FR", product: "pad", endUser: "retail" });
  const tax = split({ netProfit: 10, taxEstimate: 2, country: "FR" });
  order.stages.reconciliation = {
    consistent: ledgerOk(order),
    sanctions: sanctions.decision,
    tax: tax.emergencyReserve,
  };
  order.history = Object.keys(order.stages);
  order.consistent = ledgerOk(order);
  if (scenario === "happy") {
    order.events.push({ orderId: id, ok: true }, { sanctions: sanctions.decision }, { tax: tax.emergencyReserve });
  }
  return store.put(order);
}

function runConnected(scenario = "happy") {
  const store = createStore();
  const orderId = scenario === "duplicate_order" ? "SYN-DUP" : undefined;
  const order = runIsolatedOrder({ scenario, store, orderId });
  return {
    ...order,
    live: false,
    engines: 11,
    events: order.events,
    scenario: order.scenario,
    consistent: order.consistent,
    blockedByMinNet: order.stages.pricing?.undercutBlockedByMinNet || false,
  };
}

const SCENARIOS = Object.freeze([
  "happy",
  "duplicate_order",
  "failed_payment",
  "partial_refund",
  "supplier_unavailable",
  "stock_change",
  "insufficient_profit",
  "shipment_delay",
  "customer_cancel",
  "supplier_refuses_reimbursement",
  "timeout",
  "partial_delivery",
  "cargo_loss",
  "financial_mismatch",
]);

function runAll() {
  const store = createStore();
  return Object.fromEntries(SCENARIOS.map((name) => [name, runIsolatedOrder({ scenario: name, store, orderId: `SYN-${name}` })]));
}

module.exports = { createStore, runIsolatedOrder, runConnected, runAll, SCENARIOS };
