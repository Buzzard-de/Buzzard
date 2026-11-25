const pricingEngine = require("../../buzzardNative/core/specialists/pricingEngine");
const { evaluateOffer } = require("../../commerce/pricingPolicy");
const stockEngine = require("../../buzzardNative/core/specialists/stockEngine");
const { LIMITS } = require("./contract");

function priceFromEngines(input) {
  const costs = input.costs;
  if (!costs) return { ok: false, code: "MISSING_COST", live: false };
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
  if (!quote.ok) return { ok: false, code: quote.code, live: false };
  const salePrice = Number(input.salePrice ?? quote.price);
  const listPrice = Number(input.listPrice ?? salePrice);
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
  if (!offer.ok) return { ok: false, code: offer.reasons[0] || "PRICE_INVALID", live: false };
  if (!Number.isFinite(listPrice) || listPrice < salePrice) return { ok: false, code: "PRICE_INVALID", live: false };
  return { ok: true, salePrice, listPrice, quote, live: false };
}

function stockFromEngine(input) {
  const updatedAt = input.updatedAt == null ? Date.now() : input.updatedAt;
  const inspected = stockEngine.inspectFeeds({
    actorId: "stock_ai",
    feeds: [{ supplier: input.supplier || "catalog", sku: input.sku, qty: input.quantity, updatedAt }],
  });
  if (!inspected.ok) return { ok: false, code: inspected.code, live: false };
  if (inspected.stale.length) return { ok: false, code: "STALE_STOCK", live: false };
  const quantity = Number(input.quantity);
  if (!Number.isInteger(quantity) || quantity < 0) return { ok: false, code: "QUANTITY_INVALID", live: false };
  return { ok: true, quantity, liveSupplierApi: inspected.liveSupplierApi, live: false };
}

function mapPriceStockBatch(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return { ok: false, code: "PRICE_STOCK_MISSING", live: false };
  if (rows.length > LIMITS.batchSize) return { ok: false, code: "BATCH_TOO_LARGE", live: false };
  const items = [];
  const failures = [];
  for (const row of rows) {
    const barcode = String(row.barcode || "").trim();
    if (!barcode) {
      failures.push({ sku: row.sku || null, code: "BARCODE_INVALID" });
      continue;
    }
    const price = priceFromEngines(row);
    const stock = stockFromEngine(row);
    if (!price.ok || !stock.ok) {
      failures.push({ barcode, code: !price.ok ? price.code : stock.code });
      continue;
    }
    items.push({ barcode, quantity: stock.quantity, salePrice: price.salePrice, listPrice: price.listPrice });
  }
  if (failures.length) return { ok: false, code: "PRICE_STOCK_REJECTED", failures, live: false };
  return { ok: true, body: { items }, live: false, network: false };
}

module.exports = { priceFromEngines, stockFromEngine, mapPriceStockBatch };
