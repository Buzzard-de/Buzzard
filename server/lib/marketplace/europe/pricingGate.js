const pricingEngine = require("../../buzzardNative/core/specialists/pricingEngine");
const { evaluateOffer } = require("../../commerce/pricingPolicy");
const stockEngine = require("../../buzzardNative/core/specialists/stockEngine");
const { calculateVat } = require("../../buzzardNative/core/tax/vatEngine");

function priceFromEngines(input) {
  const costs = input.costs;
  if (!costs || costs.marketplaceCommission == null || costs.shipping == null || costs.vat == null || costs.returnReserve == null || costs.supplierCost == null || costs.paymentFees == null) {
    return { ok: false, code: "PRICING_NOT_VERIFIED", live: false };
  }
  const quote = pricingEngine.quote({
    actorId: "pricing_ai",
    supplierCost: costs.supplierCost,
    shipping: costs.shipping,
    marketplaceCommission: costs.marketplaceCommission,
    vat: costs.vat,
    returnReserve: costs.returnReserve,
    paymentFees: costs.paymentFees,
    category: input.category || "other",
  });
  if (!quote.ok) return { ok: false, code: quote.code || "PRICING_NOT_VERIFIED", live: false, publish: false };
  const salePrice = Number(input.salePrice ?? quote.price);
  const offer = evaluateOffer({
    offerPrice: salePrice,
    supplierCost: costs.supplierCost,
    shippingCost: costs.shipping,
    marketplaceFee: costs.marketplaceCommission,
    paymentFee: costs.paymentFees,
    vatOnFees: costs.vat,
    returnReserve: costs.returnReserve,
    categoryMargin: quote.targetMargin || 0.07,
  });
  if (!offer.ok) return { ok: false, code: "PRICING_NOT_VERIFIED", reasons: offer.reasons, live: false, publish: false };
  const vat = calculateVat({
    sellerCountry: input.sellerCountry || "DE",
    customerCountry: input.country,
    deliveryCountry: input.country,
    goodsNet: salePrice,
  });
  return { ok: true, salePrice, quote, vat, publish: false, live: false };
}

function stockFromEngine(input) {
  if (input.quantity == null) return { ok: false, code: "QUANTITY_INVALID", live: false };
  const updatedAt = input.updatedAt == null ? Date.now() : input.updatedAt;
  const inspected = stockEngine.inspectFeeds({
    actorId: "stock_ai",
    feeds: [{ supplier: input.supplier || "catalog", sku: input.sku, qty: input.quantity, updatedAt }],
  });
  if (!inspected.ok) return { ok: false, code: inspected.code, live: false };
  if (inspected.stale.length) return { ok: false, code: "STALE_STOCK", live: false };
  const quantity = Number(input.quantity);
  if (!Number.isInteger(quantity) || quantity < 0) return { ok: false, code: "QUANTITY_INVALID", live: false };
  return { ok: true, quantity, liveSupplierApi: false, live: false };
}

module.exports = { priceFromEngines, stockFromEngine };
