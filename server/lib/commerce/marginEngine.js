/**
 * Cost stack + estimated vs realized net profit.
 * Unreimbursed supplier returns stay estimated, never realized.
 */
const { roundMoney } = require("./commerceValidation");
const { estimateVat } = require("./ab27Tax");

function stackCosts({
  supplierCost = 0,
  shippingCost = 0,
  marketplaceFee = 0,
  returnReserve = 0,
  otherCost = 0,
  country = "DE",
} = {}) {
  const parts = {
    supplierCost: roundMoney(supplierCost),
    shippingCost: roundMoney(shippingCost),
    marketplaceFee: roundMoney(marketplaceFee),
    returnReserve: roundMoney(returnReserve),
    otherCost: roundMoney(otherCost),
  };
  const netBeforeVat = roundMoney(Object.values(parts).reduce((a, b) => a + b, 0));
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
