const { check } = require("../permissionEngine");
const {
  recommendPrice,
  CATEGORY_MARGINS,
  MIN_NET_PROFIT_EUR,
  MARKET_UNDERCUT_EUR,
} = require("../../../commerce/pricingPolicy");

const MIN_NET = MIN_NET_PROFIT_EUR;
const UNDERCUT = MARKET_UNDERCUT_EUR;
const MARGIN = Object.freeze({
  automotive: CATEGORY_MARGINS.automotive,
  beverage_crate: CATEGORY_MARGINS.beverage_crate,
  other: CATEGORY_MARGINS.other,
});

function quote(input = {}) {
  const actorId = input.actorId || "pricing_ai";
  if (!check(actorId, "PRICE_CALCULATE").ok) return { ok: false, code: "PERMISSION_DENIED" };
  return recommendPrice(input);
}

function publishLive() {
  return { ok: false, code: "HUMAN_GATE_REQUIRED", action: "PRICE_PUBLISH_LIVE" };
}

function buy() {
  return { ok: false, code: "HUMAN_GATE_REQUIRED", action: "STOCK_BUY" };
}

module.exports = { quote, publishLive, buy, MIN_NET, UNDERCUT, MARGIN };
