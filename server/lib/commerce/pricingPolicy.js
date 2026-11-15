/**
 * Approved commercial price rules. Recommendation only. Does not enable sales.
 */
const MIN_NET_PROFIT_EUR = 0.5;
const MARKET_UNDERCUT_EUR = 0.1;

function landedCost({
  supplierCost = 0,
  shippingCost = 0,
  marketplaceFee = 0,
  paymentFee = 0,
  vatOnFees = 0,
  returnReserve = 0,
  otherCost = 0,
} = {}) {
  const parts = [supplierCost, shippingCost, marketplaceFee, paymentFee, vatOnFees, returnReserve, otherCost];
  const landed = parts.reduce((sum, value) => sum + Number(value || 0), 0);
  return Math.round(Math.max(0, landed) * 100) / 100;
}

function evaluateOffer({
  offerPrice,
  comparableMarketPrice,
  categoryMargin = 0.12,
  ...costs
} = {}) {
  const cost = landedCost(costs);
  const price = Number(offerPrice);
  const market = Number(comparableMarketPrice);
  const profit = Math.round((price - cost) * 100) / 100;
  const margin = price > 0 ? profit / price : 0;
  const targetMax = Number.isFinite(market) ? Math.round((market - MARKET_UNDERCUT_EUR) * 100) / 100 : null;
  const reasons = [];
  if (!(price > 0)) reasons.push("PRICE_INVALID");
  if (profit < MIN_NET_PROFIT_EUR) reasons.push("MIN_NET_PROFIT");
  if (margin + 1e-9 < categoryMargin) reasons.push("CATEGORY_MARGIN");
  if (targetMax != null && price > targetMax) reasons.push("ABOVE_UNDERCUT_TARGET");
  return {
    ok: reasons.length === 0,
    reasons,
    cost,
    profit,
    margin: Math.round(margin * 10000) / 10000,
    targetMax,
    minNetProfit: MIN_NET_PROFIT_EUR,
    undercutEur: MARKET_UNDERCUT_EUR,
    livePriceWrite: false,
    salesEnabled: false,
  };
}

module.exports = { MIN_NET_PROFIT_EUR, MARKET_UNDERCUT_EUR, landedCost, evaluateOffer };
