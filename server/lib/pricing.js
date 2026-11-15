const { CATEGORY_MARGINS, resolveCategoryMargin, MIN_NET_PROFIT_EUR, roundMoney } = require("./commerce/pricingPolicy");

function calculateSalePrice({
  supplierPrice,
  category,
  currency = "EUR",
  markupPercent,
} = {}) {
  if (supplierPrice == null || supplierPrice === "" || !Number.isFinite(Number(supplierPrice)) || Number(supplierPrice) <= 0) {
    return { amount: null, currency, code: "MISSING_SUPPLIER_COST", commercialPolicy: "pricingPolicy" };
  }
  const purchase = Number(supplierPrice);
  const rule = resolveCategoryMargin(category);
  let amount = roundMoney(purchase / (1 - rule.margin));
  if (roundMoney(amount - purchase) + 1e-9 < MIN_NET_PROFIT_EUR) {
    amount = roundMoney(purchase + MIN_NET_PROFIT_EUR);
  }
  const supplied = Number(markupPercent);
  const marginOverrideIgnored =
    markupPercent != null && Number.isFinite(supplied) && Math.abs(supplied - rule.margin * 100) > 1e-6;
  return {
    amount,
    currency,
    targetMargin: rule.margin,
    marginRule: rule.rule,
    marginOverrideIgnored,
    commercialPolicy: "pricingPolicy",
  };
}

function applySafetyStock() {
  return { stock: null, stock_status: "UNKNOWN", stockVerified: false, purchasable: false };
}

function validatePrice(price, options = {}) {
  const amount = Number(price?.amount ?? price);
  if (Number.isNaN(amount) || amount < 0) return { ok: false, error: "invalid_price" };
  const minAmount = Number(options.minAmount ?? 0);
  if (amount < minAmount) return { ok: false, error: "price_below_minimum" };
  if (amount > 999999) return { ok: false, error: "price_too_high" };
  return {
    ok: true,
    value: { amount: Math.round(amount * 100) / 100, currency: price?.currency || "EUR" },
  };
}

function marginPercent(salePrice, purchasePrice) {
  const sale = Number(salePrice) || 0;
  const purchase = Number(purchasePrice) || 0;
  if (sale <= 0 || purchase <= 0) return 0;
  return Math.round(((sale - purchase) / sale) * 10000) / 100;
}

function meetsMinimumMargin({ salePrice, purchasePrice, minimumMarginPercent = CATEGORY_MARGINS.other * 100 }) {
  return marginPercent(salePrice, purchasePrice) >= minimumMarginPercent;
}

module.exports = {
  calculateSalePrice,
  applySafetyStock,
  validatePrice,
  marginPercent,
  meetsMinimumMargin,
};
