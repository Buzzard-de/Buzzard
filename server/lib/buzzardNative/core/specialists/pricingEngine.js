const { check } = require("../permissionEngine");

const MIN_NET = 0.5;
const UNDERCUT = 0.1;
const MARGIN = { automotive: 0.11, other: 0.07 };

function quote({
  actorId = "pricing_ai",
  supplierCost,
  shipping,
  marketplaceCommission,
  vat,
  returnReserve,
  paymentFees,
  fx = 1,
  marketPrice,
  category = "other",
} = {}) {
  if (!check(actorId, "PRICE_CALCULATE").ok) return { ok: false, code: "PERMISSION_DENIED" };
  const parts = { supplierCost, shipping, marketplaceCommission, vat, returnReserve, paymentFees };
  if (Object.values(parts).some((v) => v == null || Number.isNaN(Number(v)))) {
    return { ok: false, code: "MISSING_COST", publish: false, humanReview: true };
  }
  const landed =
    (Number(supplierCost) + Number(shipping) + Number(marketplaceCommission) + Number(vat) + Number(returnReserve) + Number(paymentFees)) *
    Number(fx || 1);
  const targetMargin = category === "automotive" || category === "bz.01" ? MARGIN.automotive : MARGIN.other;
  let price = landed / (1 - targetMargin);
  if (price - landed < MIN_NET) price = landed + MIN_NET;
  if (marketPrice != null) {
    const beat = Number(marketPrice) - UNDERCUT;
    if (beat - landed >= MIN_NET) price = Math.min(price, beat);
    else {
      return {
        ok: true,
        landed,
        price,
        net: price - landed,
        undercutBlockedByMinNet: true,
        publish: false,
        humanReview: true,
        livePublish: false,
      };
    }
  }
  const net = price - landed;
  if (net < MIN_NET) return { ok: false, code: "BELOW_MIN_NET", publish: false, humanReview: true };
  return {
    ok: true,
    landed: Number(landed.toFixed(4)),
    price: Number(price.toFixed(2)),
    net: Number(net.toFixed(4)),
    targetMargin,
    minNet: MIN_NET,
    publish: false,
    livePublish: false,
    autoSale: false,
  };
}

function publishLive() {
  return { ok: false, code: "HUMAN_GATE_REQUIRED", action: "PRICE_PUBLISH_LIVE" };
}

function buy() {
  return { ok: false, code: "HUMAN_GATE_REQUIRED", action: "STOCK_BUY" };
}

module.exports = { quote, publishLive, buy, MIN_NET, UNDERCUT, MARGIN };
