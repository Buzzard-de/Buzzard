/**
 * Sandbox refund, payout, reconciliation, settlement, and treasury.
 * No function in this module moves money or assumes a supplier refund.
 */
const { evaluateSalesGate } = require("../../salesSafetyGate");
const { initiateTransfer } = require("../../finance/bankingAdapter");

function payout() {
  const gate = evaluateSalesGate();
  const transfer = initiateTransfer();
  return {
    ok: false,
    code: "HUMAN_GATE_REQUIRED",
    moneyMoved: false,
    live: false,
    salesLocked: gate.locked,
    transferCode: transfer.code,
  };
}

function reconcile({ ledgerLines = [], statementLines = [] } = {}) {
  const ledgerTotal = ledgerLines.reduce((sum, line) => sum + Number(line.amountCents || 0), 0);
  const statementTotal = statementLines.reduce((sum, line) => sum + Number(line.amountCents || 0), 0);
  const matched = ledgerTotal === statementTotal && ledgerLines.length === statementLines.length;
  return {
    ok: true,
    code: matched ? "RECONCILED" : "BREAK",
    matched,
    ledgerTotal,
    statementTotal,
    liveStatement: false,
    moneyMoved: false,
  };
}

function settlementPlan({ amountCents = 0, currency = "EUR" } = {}) {
  return {
    ok: true,
    code: "NOT_LIVE",
    status: "PLANNED",
    amountCents: Number(amountCents) || 0,
    currency,
    live: false,
    moneyMoved: false,
  };
}

function treasury({ balances = [] } = {}) {
  const total = balances.reduce((sum, row) => sum + Number(row.amountCents || 0), 0);
  return {
    ok: true,
    code: "SANDBOX_POSITION",
    totalCents: total,
    transfer: false,
    moneyMoved: false,
    live: false,
  };
}

module.exports = { payout, reconcile, settlementPlan, treasury };
