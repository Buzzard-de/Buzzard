/**
 * Connected isolated 11-engine scenario with failure cases.
 * Outputs are verifiable objects. Not live commerce.
 */
const { runMatrix } = require("./isolatedCheckoutMatrix");
const { calculate, applyCustomerRefund, MIN_NET } = require("../finance/unifiedPricing");
const { buyStock } = require("./engineRegistry");
const { initiateTransfer } = require("../finance/bankingAdapter");
const { screen } = require("../compliance/sanctionsAdapter");
const { split } = require("../finance/taxReserves");

function ledger() {
  const rows = [];
  function post(kind, amount, note) {
    rows.push({ kind, amount: Number(amount), note, assumedSupplierCredit: false });
  }
  function consistent() {
    const refunds = rows.filter((r) => r.kind === "CUSTOMER_REFUND").reduce((s, r) => s + r.amount, 0);
    const credits = rows.filter((r) => r.kind === "SUPPLIER_CREDIT").reduce((s, r) => s + r.amount, 0);
    return { refunds, credits, mixed: false, ok: credits === 0 || credits <= refunds };
  }
  return { post, consistent, rows };
}

function runConnected(scenario = "happy") {
  const book = ledger();
  const base = runMatrix({ category: scenario === "other_margin" ? "other" : "automotive", country: "FR" });
  const events = [];
  const idemp = new Set();

  function order(key) {
    if (idemp.has(key)) return { ok: false, code: "DUPLICATE_ORDER" };
    idemp.add(key);
    return { ok: true, orderId: key, live: false };
  }

  if (scenario === "supplier_unavailable") {
    events.push({ step: "supplier", ok: false, code: "SUPPLIER_UNAVAILABLE" });
    return { ...base, scenario, events, live: false, consistent: book.consistent().ok };
  }
  if (scenario === "stock_change") {
    events.push({ step: "stock", qty: 0, buy: buyStock().code });
    return { ...base, scenario, events, live: false };
  }
  if (scenario === "insufficient_profit") {
    const q = calculate({
      actorId: "pricing_ai",
      supplierCost: 9.8,
      shipping: 0.1,
      marketplaceCommission: 0.1,
      vat: 0,
      returnReserve: 0,
      paymentFees: 0,
      category: "other",
      marketPrice: 10.0,
    });
    events.push({ step: "profit", quote: q, minNet: MIN_NET });
    return { ...base, scenario, events, live: false, blockedByMinNet: q.undercutBlockedByMinNet || !q.ok };
  }
  if (scenario === "duplicate_order") {
    events.push(order("SYN-DUP"));
    events.push(order("SYN-DUP"));
    return { ...base, scenario, events, live: false };
  }
  if (scenario === "failed_payment") {
    const pay = initiateTransfer();
    events.push({ step: "payment", sent: pay.sent, code: pay.code });
    return { ...base, scenario, events, live: false };
  }
  if (scenario === "shipment_delay") {
    events.push({ step: "track", delay: true, liveCarrier: false, eta: "UNKNOWN" });
    return { ...base, scenario, events, live: false };
  }
  if (scenario === "customer_cancel") {
    events.push({ step: "cancel", code: "HUMAN_GATE_REQUIRED", sent: false });
    return { ...base, scenario, events, live: false };
  }
  if (scenario === "partial_refund") {
    const after = applyCustomerRefund({ estimatedProfit: 12, refund: 3 });
    book.post("CUSTOMER_REFUND", 3, "partial");
    book.post("SUPPLIER_CREDIT", 0, "not_assumed");
    events.push({ step: "refund", ...after });
    return { ...base, scenario, events, live: false, consistent: book.consistent().ok, actualProfit: after.actualProfit };
  }
  if (scenario === "supplier_refuses_reimbursement") {
    book.post("CUSTOMER_REFUND", 5, "full");
    book.post("SUPPLIER_CREDIT", 0, "refused_or_unknown");
    return {
      ...base,
      scenario,
      events: [{ step: "supplier_credit", assumed: false, amount: 0 }],
      consistent: book.consistent().ok,
      live: false,
    };
  }
  if (scenario === "price_change") {
    const a = calculate({
      actorId: "pricing_ai",
      supplierCost: 10,
      shipping: 2,
      marketplaceCommission: 1,
      vat: 2,
      returnReserve: 0.5,
      paymentFees: 0.4,
      category: "automotive",
    });
    const b = calculate({
      actorId: "pricing_ai",
      supplierCost: 12,
      shipping: 2,
      marketplaceCommission: 1,
      vat: 2,
      returnReserve: 0.5,
      paymentFees: 0.4,
      category: "automotive",
    });
    events.push({ before: a.price, after: b.price });
    return { ...base, scenario, events, live: false };
  }

  const happy = order("SYN-HAPPY");
  const hold = screen({ origin: "DE", destination: "FR", product: "pad", endUser: "retail" });
  const tax = split({ netProfit: 10, taxEstimate: 2, country: "FR" });
  events.push(happy, { sanctions: hold.decision }, { tax: tax.emergencyReserve });
  return { ...base, scenario: "happy", events, live: false, engines: 11, consistent: true };
}

module.exports = { runConnected };
