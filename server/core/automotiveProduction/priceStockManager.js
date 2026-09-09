/**
 * Automotive Production Integration — price and stock manager.
 */
const automotiveCore = require("../automotiveCore");
const { PRODUCTION_CONFIG } = require("./productionConfig");
const { productionError } = require("./productionErrors");
const { recordIntegrationAudit } = require("./integrationAudit");

function calculateProductPrice(input = {}) {
  const result = automotiveCore.calculatePrice({
    supplierCost: input.purchasePrice ?? input.supplierCost,
    supplierShippingCost: input.shippingCost,
    supplierFees: input.fees,
    tax: input.tax,
    desiredMargin: input.margin,
    currency: input.currency || "EUR",
  });

  const salesEnabled = PRODUCTION_CONFIG.salesEnabled();
  return {
    ...result,
    calculated: true,
    publishable: salesEnabled && result.publicPriceAllowed,
    reason: salesEnabled ? result.reason : "SALES_DISABLED",
  };
}

function normalizeProductStock(raw = {}) {
  return automotiveCore.normalizeStock({
    supplierStock: raw.supplierStock ?? raw.stock,
    reservedStock: raw.reservedStock,
    lastUpdated: raw.lastUpdated || new Date().toISOString(),
    source: raw.source || "supplier",
  });
}

function validateProductStock(stock = {}) {
  const normalized = normalizeProductStock(stock);
  const validation = automotiveCore.validateStock(normalized);

  const maxAgeMinutes = PRODUCTION_CONFIG.stockMaxAgeMinutes();
  const lastUpdated = new Date(normalized.lastUpdated).getTime();
  const ageMinutes = (Date.now() - lastUpdated) / 60000;
  const stale = ageMinutes > maxAgeMinutes;

  if (stale) {
    recordIntegrationAudit({
      action: "STOCK_UPDATED",
      entityId: stock.sku,
      result: "STALE",
      metadata: { ageMinutes: Math.round(ageMinutes) },
    });
    return {
      valid: false,
      status: "STALE",
      error: productionError("STALE_STOCK", "Stock data is stale", { requiresHumanReview: true }),
      stock: normalized,
    };
  }

  return { ...validation, stock: normalized, stale: false };
}

function updatePriceSnapshot(sku, priceData = {}) {
  const calc = calculateProductPrice(priceData);
  recordIntegrationAudit({
    action: "PRICE_UPDATED",
    entityId: sku,
    metadata: { publishable: calc.publishable, reason: calc.reason },
  });
  return {
    sku,
    snapshot: {
      purchasePrice: calc.purchasePrice,
      customerPrice: calc.customerPrice,
      currency: calc.currency,
      publishable: calc.publishable,
      calculatedAt: new Date().toISOString(),
    },
  };
}

module.exports = {
  calculateProductPrice,
  normalizeProductStock,
  validateProductStock,
  updatePriceSnapshot,
};
