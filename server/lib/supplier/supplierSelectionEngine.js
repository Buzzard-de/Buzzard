/**
 * Post-order supplier selection (dropship). Buzzard does not buy stock ahead of customer orders.
 */
const { buyStock } = require("../commerce/engineRegistry");
const { createSupplierError } = require("./supplierErrors");
const { SUPPLIER_ERROR_CODE } = require("../../core/supplierIntegrationConstants");

function scoreOffer(offer = {}) {
  const cost = Number(offer.unitCost ?? offer.supplier_price?.amount ?? 999999);
  const stock = Number(offer.stock ?? 0);
  const reliability = Number(offer.reliabilityScore ?? 0.7);
  const leadDays = Number(offer.leadTimeDays ?? 5);
  if (stock <= 0) return -1;
  const costScore = 1 / Math.max(cost, 0.01);
  const stockScore = Math.min(stock, 100) / 100;
  const leadScore = 1 / Math.max(leadDays, 1);
  return reliability * 0.45 + costScore * 0.35 + stockScore * 0.15 + leadScore * 0.05;
}

function rankSupplierOffers(offers = []) {
  return [...offers]
    .map((offer) => ({
      ...offer,
      score: scoreOffer(offer),
      inStock: Number(offer.stock ?? 0) > 0,
    }))
    .filter((row) => row.inStock && row.score >= 0)
    .sort((a, b) => b.score - a.score);
}

function selectSupplierForOrder({ lineItems = [], offersBySku = {} } = {}) {
  const stockBuy = buyStock();
  if (stockBuy.ok) {
    return createSupplierError(SUPPLIER_ERROR_CODE.OPERATION_BLOCKED, {
      message: "Pre-buy stock is forbidden",
      code: stockBuy.code,
    });
  }

  const lines = [];
  const missing = [];
  for (const line of lineItems) {
    const sku = line.sku || line.supplierSku;
    const offers = offersBySku[sku] || [];
    const ranked = rankSupplierOffers(offers);
    if (!ranked.length) {
      missing.push({ sku, code: "NO_IN_STOCK_SUPPLIER" });
      continue;
    }
    lines.push({
      sku,
      quantity: line.quantity || 1,
      primary: ranked[0],
      fallback: ranked[1] || null,
      liveOrder: false,
      dropship: true,
    });
  }

  return {
    ok: missing.length === 0,
    lines,
    missing,
    preBuyBlocked: true,
    live: false,
    supplierOrdersEnabled: false,
  };
}

module.exports = { scoreOffer, rankSupplierOffers, selectSupplierForOrder };