/**
 * Automotive Production Integration — configuration and startup validation.
 */
const { productionError } = require("./productionErrors");

function envFlag(key, defaultValue = "0") {
  return process.env[key] ?? defaultValue;
}

function isEnabled(key) {
  return envFlag(key) === "1";
}

const PRODUCTION_CONFIG = Object.freeze({
  automotiveProductionEnabled: () => isEnabled("AUTOMOTIVE_PRODUCTION_ENABLED"),
  supplierLiveEnabled: () => isEnabled("SUPPLIER_LIVE_ENABLED"),
  realSupplierLiveImport: () => isEnabled("REAL_SUPPLIER_LIVE_IMPORT"),
  tecdocEnabled: () => isEnabled("TECDOC_ENABLED"),
  tecdocDryRun: () => envFlag("TECDOC_DRY_RUN", "1") === "1",
  supplierSyncEnabled: () => isEnabled("SUPPLIER_SYNC_ENABLED"),
  stockSyncEnabled: () => isEnabled("STOCK_SYNC_ENABLED"),
  priceSyncEnabled: () => isEnabled("PRICE_SYNC_ENABLED"),
  tecdocSyncEnabled: () => isEnabled("TECDOC_SYNC_ENABLED"),
  autoOrderEnabled: () => isEnabled("AUTO_ORDER_ENABLED"),
  orderLiveEnabled: () => isEnabled("ORDER_LIVE_ENABLED"),
  autoPublish: () => isEnabled("AUTOMOTIVE_AUTO_PUBLISH"),
  salesEnabled: () => isEnabled("SALES_ENABLED") || isEnabled("BUZZARD_SALES_ENABLED"),
  paymentsEnabled: () => isEnabled("PAYMENTS_ENABLED"),
  stockMaxAgeMinutes: () => Number(process.env.STOCK_MAX_AGE_MINUTES || 30),
  supplierRateLimit: () => Number(process.env.SUPPLIER_RATE_LIMIT || 60),
  tecdocRateLimit: () => Number(process.env.TECDOC_RATE_LIMIT || 30),
  maxRetryAttempts: () => Number(process.env.INTEGRATION_MAX_RETRIES || 4),
  supplierScoreWeights: () => ({
    price: Number(process.env.SUPPLIER_WEIGHT_PRICE || 0.3),
    stock: Number(process.env.SUPPLIER_WEIGHT_STOCK || 0.2),
    delivery: Number(process.env.SUPPLIER_WEIGHT_DELIVERY || 0.2),
    reliability: Number(process.env.SUPPLIER_WEIGHT_RELIABILITY || 0.2),
    shipping: Number(process.env.SUPPLIER_WEIGHT_SHIPPING || 0.1),
  }),
});

function validateProductionConfig() {
  const violations = [];

  if (PRODUCTION_CONFIG.autoPublish() && process.env.HUMAN_APPROVAL_REQUIRED === "0") {
    violations.push("AUTOMOTIVE_AUTO_PUBLISH=1 requires HUMAN_APPROVAL_REQUIRED");
  }

  if (PRODUCTION_CONFIG.orderLiveEnabled() && !PRODUCTION_CONFIG.supplierLiveEnabled()) {
    violations.push("ORDER_LIVE_ENABLED=1 requires SUPPLIER_LIVE_ENABLED=1");
  }

  if (PRODUCTION_CONFIG.supplierLiveEnabled() && !PRODUCTION_CONFIG.realSupplierLiveImport()) {
    violations.push("SUPPLIER_LIVE_ENABLED=1 requires REAL_SUPPLIER_LIVE_IMPORT=1");
  }

  if (PRODUCTION_CONFIG.salesEnabled() && !PRODUCTION_CONFIG.paymentsEnabled()) {
    violations.push("SALES_ENABLED=1 without PAYMENTS_ENABLED=1 — checkout activation blocked");
  }

  return {
    valid: violations.length === 0,
    violations,
    config: {
      automotiveProductionEnabled: PRODUCTION_CONFIG.automotiveProductionEnabled(),
      supplierLiveEnabled: PRODUCTION_CONFIG.supplierLiveEnabled(),
      realSupplierLiveImport: PRODUCTION_CONFIG.realSupplierLiveImport(),
      tecdocEnabled: PRODUCTION_CONFIG.tecdocEnabled(),
      tecdocDryRun: PRODUCTION_CONFIG.tecdocDryRun(),
      orderLiveEnabled: PRODUCTION_CONFIG.orderLiveEnabled(),
      salesEnabled: PRODUCTION_CONFIG.salesEnabled(),
      paymentsEnabled: PRODUCTION_CONFIG.paymentsEnabled(),
      autoPublish: PRODUCTION_CONFIG.autoPublish(),
    },
  };
}

function assertSafeStartup() {
  const validation = validateProductionConfig();
  if (!validation.valid && PRODUCTION_CONFIG.autoPublish()) {
    throw new Error(`Unsafe production config: ${validation.violations.join("; ")}`);
  }
  return validation;
}

function getSupplierEnvPrefix(supplierId) {
  const slug = String(supplierId || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "_");
  return `SUPPLIER_${slug}`;
}

function getSupplierCredentials(supplierId) {
  const prefix = getSupplierEnvPrefix(supplierId);
  return {
    apiUrl: process.env[`${prefix}_API_URL`] || null,
    apiKey: process.env[`${prefix}_API_KEY`] ? "[REDACTED]" : null,
    apiSecret: process.env[`${prefix}_API_SECRET`] ? "[REDACTED]" : null,
    configured: Boolean(process.env[`${prefix}_API_URL`] && process.env[`${prefix}_API_KEY`]),
  };
}

module.exports = {
  PRODUCTION_CONFIG,
  validateProductionConfig,
  assertSafeStartup,
  getSupplierEnvPrefix,
  getSupplierCredentials,
  productionError,
};
