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

module.exports = { calculateSalePrice, applySafetyStock };
