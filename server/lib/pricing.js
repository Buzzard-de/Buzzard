function calculateSalePrice({
  supplierPrice,
  markupPercent = 38,
  minimumMarginPercent = 12,
  currency = "EUR",
}) {
  const purchase = Number(supplierPrice) || 0;
  if (purchase <= 0) return { amount: 0, currency };

  let sale = purchase * (1 + markupPercent / 100);
  const minSale = purchase * (1 + minimumMarginPercent / 100);
  if (sale < minSale) sale = minSale;

  return { amount: Math.round(sale * 100) / 100, currency };
}

function applySafetyStock(stock, safetyStock = 0) {
  const available = Math.max(0, Number(stock) - Number(safetyStock));
  let stockStatus = "in_stock";
  if (available <= 0) stockStatus = "out_of_stock";
  else if (available < 10) stockStatus = "low_stock";
  return { stock: available, stock_status: stockStatus };
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

function meetsMinimumMargin({ salePrice, purchasePrice, minimumMarginPercent = 12 }) {
  return marginPercent(salePrice, purchasePrice) >= minimumMarginPercent;
}

module.exports = {
  calculateSalePrice,
  applySafetyStock,
  validatePrice,
  marginPercent,
  meetsMinimumMargin,
};
