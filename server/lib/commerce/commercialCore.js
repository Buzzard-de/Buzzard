/**
 * Dry commercial chain: supplier feed → catalog object → price → stock → review decision.
 * Does not write PIM, publish a product, buy stock, or enable sales.
 */
const { importSupplierFeed } = require("../supplier/supplierImportPipeline");
const { deriveStockStatus } = require("../operations/stockEngine");
const { checkStaleData } = require("../supplier/supplierPriceStockReadiness");
const { estimateVat } = require("./ab27Tax");
const { profit } = require("./marginEngine");
const { evaluateSalesGate } = require("../salesSafetyGate");
const {
  MIN_NET_PROFIT_EUR,
  MARKET_UNDERCUT_EUR,
  CATEGORY_TARGET_MARGIN,
  landedCost,
} = require("./pricingPolicy");

const DECISIONS = Object.freeze({
  READY_FOR_REVIEW: "READY_FOR_REVIEW",
  PRICE_NOT_VIABLE: "PRICE_NOT_VIABLE",
  OUT_OF_STOCK: "OUT_OF_STOCK",
  INVALID_PRODUCT: "INVALID_PRODUCT",
  DUPLICATE_PRODUCT: "DUPLICATE_PRODUCT",
  CATEGORY_REVIEW_REQUIRED: "CATEGORY_REVIEW_REQUIRED",
  SUPPLIER_DATA_INCOMPLETE: "SUPPLIER_DATA_INCOMPLETE",
});

const CATEGORY_REVIEW_CODES = new Set([
  "CATEGORY_RETIRED",
  "CATEGORY_HUB",
  "CATEGORY_AMBIGUOUS",
  "CATEGORY_UNKNOWN",
  "CATEGORY_UNMAPPED",
  "CATEGORY_MISSING",
  "CATEGORY_MISMATCH",
  "SUBCATEGORY_REQUIRED",
]);

function roundMoney(amount) {
  return Math.round(Number(amount) * 100) / 100;
}

function targetMarginForCategory(category = {}) {
  const id = String(category.activeCategoryId || category.id || "").toLowerCase();
  const slug = String(category.slug || "").toLowerCase();
  const sub = String(category.subcategorySlug || "").toLowerCase();
  const name = String(category.name || "").toLowerCase();
  const drinks = id === "cat-46" || id === "bz.26" || slug.includes("getraenke") || sub.includes("getraenke") || name.includes("getränk") || name.includes("getrank");
  if (drinks) return CATEGORY_TARGET_MARGIN.drinks;
  const automotive = id === "cat-05" || slug === "automotive" || name.includes("automotive") || name.includes("kfz");
  if (automotive) return CATEGORY_TARGET_MARGIN.automotive;
  return CATEGORY_TARGET_MARGIN.other;
}

function knownAmount(value) {
  if (value == null || value === "") return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return Number.NaN;
  return roundMoney(amount);
}

function quoteCommercialPrice(input = {}) {
  const fields = {
    supplierCost: knownAmount(input.supplierCost),
    shippingCost: knownAmount(input.shippingCost),
    marketplaceFee: knownAmount(input.marketplaceFee),
    paymentFee: knownAmount(input.paymentFee),
    returnReserve: knownAmount(input.returnReserve),
    otherCost: knownAmount(input.otherCost),
  };
  const unknown = Object.entries(fields).filter(([, value]) => value == null).map(([key]) => key);
  const invalid = Object.entries(fields).filter(([, value]) => Number.isNaN(value)).map(([key]) => key);
  const market = knownAmount(input.comparableMarketPrice);
  if (market == null) unknown.push("lowestComparableMarketPrice");
  if (Number.isNaN(market)) invalid.push("lowestComparableMarketPrice");
  const targetMargin = targetMarginForCategory(input.category || {});

  const base = {
    supplierCost: fields.supplierCost,
    shippingCost: fields.shippingCost,
    marketplaceFee: fields.marketplaceFee,
    paymentFee: fields.paymentFee,
    vat: null,
    returnReserve: fields.returnReserve,
    otherCost: fields.otherCost,
    netProfit: null,
    realizedProfit: null,
    estimatedProfit: null,
    profitMargin: null,
    lowestComparableMarketPrice: Number.isNaN(market) ? null : market,
    finalRecommendedPrice: null,
    sellNet: null,
    targetMargin,
    unknown,
    invalid,
    salesEnabled: false,
    livePriceWrite: false,
  };

  if (invalid.length) return { ok: false, code: DECISIONS.PRICE_NOT_VIABLE, ...base };
  if (unknown.length) return { ok: false, code: DECISIONS.SUPPLIER_DATA_INCOMPLETE, ...base };

  const costBasis = landedCost({
    supplierCost: fields.supplierCost,
    shippingCost: fields.shippingCost,
    marketplaceFee: fields.marketplaceFee,
    paymentFee: fields.paymentFee,
    vatOnFees: 0,
    returnReserve: fields.returnReserve,
    otherCost: fields.otherCost,
  });
  let sellNet = roundMoney(costBasis / (1 - targetMargin));
  for (let step = 0; step < 20; step += 1) {
    const profitNow = roundMoney(sellNet - costBasis);
    const marginNow = sellNet > 0 ? profitNow / sellNet : 0;
    if (profitNow + 1e-9 >= MIN_NET_PROFIT_EUR && marginNow + 1e-9 >= targetMargin) break;
    sellNet = roundMoney(sellNet + 0.01);
  }

  const country = input.country || "DE";
  let vatEstimate = estimateVat({ country, netAmount: sellNet });
  if (!vatEstimate.ok) {
    return { ok: false, code: DECISIONS.SUPPLIER_DATA_INCOMPLETE, ...base, unknown: ["vat"] };
  }

  const undercutGross = roundMoney(market - MARKET_UNDERCUT_EUR);
  if (vatEstimate.gross > undercutGross) {
    sellNet = roundMoney(undercutGross / (1 + vatEstimate.rate / 100));
    vatEstimate = estimateVat({ country, netAmount: sellNet });
    while (vatEstimate.ok && vatEstimate.gross > undercutGross && sellNet > 0) {
      sellNet = roundMoney(sellNet - 0.01);
      vatEstimate = estimateVat({ country, netAmount: sellNet });
    }
  }

  const netProfit = roundMoney(sellNet - costBasis);
  const marginRate = sellNet > 0 ? netProfit / sellNet : 0;
  const viable = netProfit + 1e-9 >= MIN_NET_PROFIT_EUR && marginRate + 1e-9 >= targetMargin && vatEstimate.gross <= undercutGross;
  const profitResult = profit({
    sellGross: vatEstimate.gross,
    costs: { vat: { vat: vatEstimate.vat }, netBeforeVat: costBasis },
    returnOccurred: input.returnOccurred === true,
    supplierReimbursedReturn: input.supplierReimbursedReturn === true,
  });

  return {
    ok: viable && profitResult.realized != null,
    code: viable && profitResult.realized != null ? "PRICE_READY" : DECISIONS.PRICE_NOT_VIABLE,
    ...base,
    vat: vatEstimate.vat,
    vatRate: vatEstimate.rate,
    netProfit,
    estimatedProfit: profitResult.estimated,
    realizedProfit: profitResult.realized,
    profitMargin: roundMoney(marginRate * 100),
    lowestComparableMarketPrice: market,
    finalRecommendedPrice: viable ? vatEstimate.gross : null,
    sellNet,
    costBasis,
    undercutGross,
    unknown: [],
  };
}

function evaluateCommercialStock(input = {}) {
  const supplier = knownAmount(input.supplierStock);
  const reserved = knownAmount(input.reservedStock);
  const unknown = [];
  if (supplier == null) unknown.push("supplierStock");
  if (reserved == null) unknown.push("reservedStock");
  const stale = checkStaleData(input.updatedAt);
  const sync = { mode: "DRY_RUN", liveSync: false, purchase: false };

  if (Number.isNaN(supplier) || Number.isNaN(reserved)) {
    return {
      ok: false,
      code: DECISIONS.OUT_OF_STOCK,
      availableStock: 0,
      reservedStock: Number.isNaN(reserved) ? null : reserved,
      supplierStock: Number.isNaN(supplier) ? null : supplier,
      stockTimestamp: input.updatedAt || null,
      fresh: false,
      stale: true,
      negative: true,
      outOfStock: true,
      supplierAvailability: false,
      confidence: "NONE",
      sellable: false,
      sync,
    };
  }
  if (unknown.length || stale.stale) {
    return {
      ok: false,
      code: DECISIONS.SUPPLIER_DATA_INCOMPLETE,
      availableStock: 0,
      reservedStock: reserved,
      supplierStock: supplier,
      stockTimestamp: input.updatedAt || null,
      fresh: false,
      stale: stale.stale,
      staleCode: stale.code,
      negative: false,
      outOfStock: false,
      supplierAvailability: false,
      confidence: "NONE",
      sellable: false,
      unknown: unknown.length ? unknown : [stale.code],
      sync,
    };
  }

  const availableQty = roundMoney(supplier - reserved);
  const derived = deriveStockStatus(availableQty, { lowThreshold: input.lowThreshold ?? 5 });
  const negative = supplier < 0 || reserved < 0 || availableQty < 0;
  const outOfStock = negative || derived.status === "OUT_OF_STOCK" || availableQty <= 0;
  const sellable = !outOfStock && (derived.status === "IN_STOCK" || derived.status === "LOW_STOCK");
  return {
    ok: sellable,
    code: outOfStock ? DECISIONS.OUT_OF_STOCK : "STOCK_READY",
    availableStock: sellable ? availableQty : 0,
    reservedStock: reserved,
    supplierStock: supplier,
    stockTimestamp: input.updatedAt,
    fresh: true,
    stale: false,
    negative,
    outOfStock,
    supplierAvailability: sellable,
    confidence: sellable ? (derived.status === "IN_STOCK" ? "HIGH" : "LOW") : "NONE",
    status: derived.status,
    sellable,
    sync,
  };
}

function commercialCatalog(row, normalized) {
  const mapped = row.catalog || {};
  const title = String(normalized.name || "").trim();
  const description = String(normalized.description || "").trim();
  const currency = String(normalized.currency || normalized.supplier_price?.currency || "").trim().toUpperCase();
  return {
    productId: row.supplierSku ? `dry_${row.format || "feed"}_${row.supplierSku}` : null,
    sku: mapped.sku || row.supplierSku || null,
    ean: mapped.ean || mapped.gtin || row.ean || null,
    gtin: mapped.gtin || mapped.ean || row.ean || null,
    mpn: mapped.mpn || null,
    brand: mapped.brand || null,
    supplierId: mapped.supplierId || row.supplierId || null,
    supplierCategory: mapped.supplierCategory || normalized.supplier_category || null,
    buzzardCategoryId: mapped.activeCategoryId || null,
    subcategoryId: mapped.subcategoryId || null,
    productTitle: title || null,
    description: description || null,
    currency: currency || null,
    supplierCost: normalized.supplier_price?.amount ?? null,
    supplierStock: normalized.stock ?? null,
    source: row.format || null,
    validationStatus: null,
    publicProductCreated: false,
    published: false,
    pimWrite: false,
  };
}

function missingCatalogFields(catalog) {
  return [
    "productId",
    "sku",
    "ean",
    "gtin",
    "mpn",
    "brand",
    "supplierId",
    "supplierCategory",
    "buzzardCategoryId",
    "subcategoryId",
    "productTitle",
    "description",
    "currency",
    "supplierCost",
    "supplierStock",
    "source",
  ].filter((field) => catalog[field] == null || catalog[field] === "");
}

function runCommercialDryRun({ supplierId, format, records = [], country = "DE" } = {}) {
  const salesGate = evaluateSalesGate();
  const feed = importSupplierFeed({ supplierId, format, records });
  const rows = [
    ...feed.catalog.map((row) => ({ ...row, duplicate: false })),
    ...feed.rejected.map((row) => ({ ...row, duplicate: false })),
    ...feed.duplicates.map((row) => ({ ...row, duplicate: true })),
  ].sort((a, b) => a.index - b.index);

  const products = rows.map((row) => {
    const normalized = row.normalized || {};
    const catalog = commercialCatalog(row, normalized);
    let decision = DECISIONS.INVALID_PRODUCT;
    let decisionCode = row.code || null;
    let price = null;
    let stock = null;

    if (row.duplicate) decision = DECISIONS.DUPLICATE_PRODUCT;
    else if (CATEGORY_REVIEW_CODES.has(row.code) || (row.code && String(row.code).startsWith("CATEGORY_"))) decision = DECISIONS.CATEGORY_REVIEW_REQUIRED;
    else if (!row.catalog) decision = DECISIONS.INVALID_PRODUCT;
    else if (!catalog.subcategoryId) {
      decision = DECISIONS.CATEGORY_REVIEW_REQUIRED;
      decisionCode = "SUBCATEGORY_REQUIRED";
    } else {
      const missing = missingCatalogFields(catalog);
      if (missing.length) decision = DECISIONS.INVALID_PRODUCT;
      else {
        price = quoteCommercialPrice({
          supplierCost: normalized.supplier_price?.amount,
          shippingCost: normalized.shipping_cost,
          marketplaceFee: normalized.marketplace_fee,
          paymentFee: normalized.payment_fee,
          returnReserve: normalized.return_reserve,
          otherCost: normalized.other_cost,
          comparableMarketPrice: normalized.comparable_market_price,
          country: normalized.country || country,
          category: row.catalog,
          returnOccurred: normalized.return_occurred === true,
          supplierReimbursedReturn: normalized.supplier_reimbursed_return === true,
        });
        stock = evaluateCommercialStock({
          supplierStock: normalized.stock,
          reservedStock: normalized.reserved_stock,
          updatedAt: normalized.stock_updated_at,
        });
        if (price.code === DECISIONS.SUPPLIER_DATA_INCOMPLETE || stock.code === DECISIONS.SUPPLIER_DATA_INCOMPLETE) {
          decision = DECISIONS.SUPPLIER_DATA_INCOMPLETE;
        } else if (stock.code === DECISIONS.OUT_OF_STOCK) decision = DECISIONS.OUT_OF_STOCK;
        else if (price.code === DECISIONS.PRICE_NOT_VIABLE) decision = DECISIONS.PRICE_NOT_VIABLE;
        else decision = DECISIONS.READY_FOR_REVIEW;
      }
    }

    catalog.validationStatus = decision;
    return {
      index: row.index,
      decision,
      code: decisionCode,
      catalog: row.duplicate ? null : catalog,
      price,
      stock,
      duplicate: row.duplicate === true,
      merged: false,
      salesEnabled: false,
      published: false,
      pimWrite: false,
    };
  });

  return {
    ok: salesGate.allowed !== true,
    dryRun: true,
    live: false,
    salesEnabled: false,
    productionReady: false,
    publicProductCreated: false,
    pimWrite: false,
    priceUpdated: false,
    stockUpdated: false,
    salesGate: salesGate.status,
    format: format || null,
    supplierId: supplierId || null,
    stages: [
      "SUPPLIER",
      "NORMALIZATION",
      "VALIDATION",
      "CATEGORY_MAPPING",
      "DUPLICATE_DETECTION",
      "PRODUCT_CATALOG",
      "PRICE_ENGINE",
      "STOCK_ENGINE",
      "MARKET_READINESS",
      "DRY_RUN_RESULT",
    ],
    products,
    summary: {
      total: products.length,
      readyForReview: products.filter((item) => item.decision === DECISIONS.READY_FOR_REVIEW).length,
      byDecision: products.reduce((counts, item) => {
        counts[item.decision] = (counts[item.decision] || 0) + 1;
        return counts;
      }, {}),
    },
  };
}

module.exports = {
  DECISIONS,
  targetMarginForCategory,
  quoteCommercialPrice,
  evaluateCommercialStock,
  runCommercialDryRun,
};
