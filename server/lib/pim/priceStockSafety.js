/**
 * Part 16 — Price and stock safety validation (no invented supplier prices).
 */
const VALID_CURRENCIES = new Set(["EUR", "USD", "GBP", "CHF", "PLN", "CZK"]);

function validateCurrency(currency) {
  const code = String(currency || "EUR").trim().toUpperCase();
  if (!code) return { ok: false, code: "CURRENCY_INVALID", value: code };
  if (!VALID_CURRENCIES.has(code)) return { ok: false, code: "CURRENCY_INVALID", value: code };
  return { ok: true, value: code };
}

function validatePurchasePrice(price, { allowMissing = false } = {}) {
  if (price == null || price === "") {
    return allowMissing ? { ok: true, warning: "PRICE_MISSING" } : { ok: false, code: "PRICE_MISSING" };
  }
  const amount = Number(price);
  if (!Number.isFinite(amount)) return { ok: false, code: "PRICE_INVALID" };
  if (amount < 0) return { ok: false, code: "PRICE_INVALID" };
  if (amount === 0) return { ok: false, code: "PRICE_INVALID" };
  if (amount > 999_999) return { ok: false, code: "PRICE_INVALID" };
  return { ok: true, value: Math.round(amount * 100) / 100 };
}

function validateRetailPrice(price) {
  if (price == null || price === "") return { ok: true, warning: "RETAIL_PRICE_MISSING" };
  const amount = Number(price);
  if (!Number.isFinite(amount) || amount < 0) return { ok: false, code: "PRICE_INVALID" };
  return { ok: true, value: Math.round(amount * 100) / 100 };
}

function validateStock(stock) {
  if (stock == null || stock === "") return { ok: true, warning: "STOCK_UNKNOWN", value: 0 };
  const qty = Number(stock);
  if (!Number.isFinite(qty)) return { ok: false, code: "STOCK_INVALID" };
  if (qty < 0) return { ok: false, code: "STOCK_INVALID" };
  if (qty > 10_000_000) return { ok: false, code: "STOCK_INVALID" };
  return { ok: true, value: Math.floor(qty) };
}

function validateMargin(purchasePrice, retailPrice, { minimumMargin = 0.12 } = {}) {
  const purchase = Number(purchasePrice);
  const retail = Number(retailPrice);
  if (!Number.isFinite(purchase) || !Number.isFinite(retail) || retail <= 0) {
    return { ok: true, warning: "MARGIN_NOT_COMPUTED" };
  }
  const margin = (retail - purchase) / retail;
  if (margin < minimumMargin) {
    return { ok: false, code: "MARGIN_BELOW_MINIMUM", margin: Number(margin.toFixed(4)) };
  }
  return { ok: true, margin: Number(margin.toFixed(4)) };
}

function validatePriceStockRecord(record, options = {}) {
  const errors = [];
  const warnings = [];

  const currencyCheck = validateCurrency(record.currency);
  if (!currencyCheck.ok) errors.push(currencyCheck.code);

  const purchaseCheck = validatePurchasePrice(record.purchasePrice, options);
  if (!purchaseCheck.ok) errors.push(purchaseCheck.code);
  else if (purchaseCheck.warning) warnings.push(purchaseCheck.warning);

  const retailCheck = validateRetailPrice(record.retailPrice);
  if (!retailCheck.ok) errors.push(retailCheck.code);
  else if (retailCheck.warning) warnings.push(retailCheck.warning);

  const stockCheck = validateStock(record.stock);
  if (!stockCheck.ok) errors.push(stockCheck.code);
  else if (stockCheck.warning) warnings.push(stockCheck.warning);

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    normalized: {
      purchasePrice: purchaseCheck.value ?? null,
      retailPrice: retailCheck.value ?? null,
      currency: currencyCheck.value || record.currency || "EUR",
      stock: stockCheck.value ?? 0,
      stockStatus: (stockCheck.value ?? 0) > 0 ? "in_stock" : "out_of_stock",
    },
  };
}

module.exports = {
  validateCurrency,
  validatePurchasePrice,
  validateRetailPrice,
  validateStock,
  validateMargin,
  validatePriceStockRecord,
  VALID_CURRENCIES,
};
