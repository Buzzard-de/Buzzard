/**
 * Cost stack + estimated vs realized net profit.
 * Unreimbursed supplier returns stay estimated, never realized.
 */
const { roundMoney } = require("./commerceValidation");
const { estimateVat } = require("./ab27Tax");

function component(value) {
  if (value == null || value === "" || !Number.isFinite(Number(value)) || Number(value) < 0) return null;
  return roundMoney(value);
}

function stackCosts({
  supplierCost,
  shippingCost,
  marketplaceFee,
  returnReserve,
  otherCost,
  country = "DE",
} = {}) {
  const parts = {
    supplierCost: component(supplierCost),
    shippingCost: component(shippingCost),
    marketplaceFee: component(marketplaceFee),
    returnReserve: component(returnReserve),
    otherCost: otherCost == null ? null : component(otherCost),
  };
  if (["supplierCost", "shippingCost", "marketplaceFee", "returnReserve"].some((key) => parts[key] == null)) {
    return {
      ok: false,
      status: "BLOCKED",
      code: "MISSING_COST",
      parts,
      netBeforeVat: null,
      vat: null,
      suggestedSellGross: null,
      invented: false,
      taxConnect: {
        status: "NOT_CONNECTED",
        note: "Tax Connect is an interface stub. No filings are submitted.",
      },
    };
  }
  const netBeforeVat = roundMoney(Object.values(parts).reduce((sum, value) => (value == null ? sum : sum + value), 0));
  const vat = estimateVat({ country, netAmount: netBeforeVat });
  return {
    ok: vat.ok,
    parts,
    netBeforeVat,
    vat: vat.ok ? vat : null,
    suggestedSellGross: vat.ok ? vat.gross : null,
    taxConnect: {
      status: "NOT_CONNECTED",
      note: "Tax Connect is an interface stub. No filings are submitted.",
    },
  };
}

function profit({ sellGross, costs, supplierReimbursedReturn = false, returnOccurred = false } = {}) {
  const gross = roundMoney(sellGross);
  const vat = costs?.vat?.vat || 0;
  const netSell = roundMoney(gross - vat);
  const spent = costs?.netBeforeVat || 0;
  const estimated = roundMoney(netSell - spent);
  let realized = estimated;
  if (returnOccurred && !supplierReimbursedReturn) {
    realized = null;
  }
  return {
    estimated,
    realized,
    returnOccurred,
    supplierReimbursedReturn,
    note:
      returnOccurred && !supplierReimbursedReturn
        ? "Supplier has not reimbursed the return — do not book realized recovery."
        : null,
  };
}

module.exports = { stackCosts, profit };
