/**
 * Part 17 — Startup configuration validation (FAIL CLOSED on dangerous combos).
 */
const goLiveApproval = require("../commerce/goLiveApproval");
const { areCredentialsConfigured, isLiveImportEnabled } = require("../supplier/realSupplierConnector");
const { getEffectiveFlags } = require("../commerce/commerceFeatureFlags");

function envFlag(name) {
  const val = process.env[name];
  if (val === undefined || val === "") return false;
  return val === "1" || val.toLowerCase() === "true";
}

function validateConfiguration() {
  const errors = [];
  const warnings = [];

  const salesEnabled = envFlag("BUZZARD_SALES_ENABLED") || envFlag("NEXT_PUBLIC_SALES_ENABLED");
  const goLiveLock = goLiveApproval.PRODUCTION_SAFETY_LOCK;

  if (salesEnabled && goLiveLock) {
    errors.push({
      code: "sales_with_go_live_lock",
      message: "SALES=1 while GO_LIVE_LOCK=true — FAIL CLOSED",
    });
  }

  if (isLiveImportEnabled()) {
    const connector = {
      supplierCode: process.env.REAL_SUPPLIER_CODE,
      apiUrl: process.env.REAL_SUPPLIER_API_URL,
      _apiKeyRaw: process.env.REAL_SUPPLIER_API_KEY,
    };
    if (!areCredentialsConfigured(connector)) {
      errors.push({
        code: "live_import_without_credentials",
        message: "REAL_SUPPLIER_LIVE_IMPORT=1 without complete credentials — FAIL CLOSED",
      });
    }
  }

  const flags = getEffectiveFlags();
  if (flags.raw.BUZZARD_PAYMENT_ENABLED && !salesEnabled) {
    errors.push({
      code: "payment_without_sales",
      message: "Payment enabled without SALES — FAIL CLOSED",
    });
  }

  if (flags.raw.BUZZARD_SUPPLIER_ORDERS_ENABLED && !salesEnabled) {
    errors.push({
      code: "supplier_orders_without_sales",
      message: "Supplier orders enabled without SALES — FAIL CLOSED",
    });
  }

  if (envFlag("BUZZARD_STRIPE_ENABLED") && !process.env.STRIPE_SECRET_KEY) {
    warnings.push({
      code: "stripe_enabled_no_secret",
      message: "BUZZARD_STRIPE_ENABLED=1 but STRIPE_SECRET_KEY missing",
    });
  }

  if (envFlag("BUZZARD_PAYPAL_ENABLED") && !process.env.PAYPAL_CLIENT_ID) {
    warnings.push({
      code: "paypal_enabled_no_credentials",
      message: "BUZZARD_PAYPAL_ENABLED=1 but PayPal credentials missing",
    });
  }

  const dbPath = process.env.BUZZARD_DB_PATH;
  if (process.env.NODE_ENV === "production" && !dbPath) {
    warnings.push({
      code: "production_no_db_path",
      message: "BUZZARD_DB_PATH not set in production — ephemeral risk",
    });
  }

  const backupDir = process.env.BUZZARD_BACKUP_DIR;
  if (process.env.NODE_ENV === "production" && dbPath?.startsWith("/var/data") && !backupDir) {
    warnings.push({
      code: "persistent_db_no_backup_dir",
      message: "Persistent DB configured but BUZZARD_BACKUP_DIR not set",
    });
  }

  if ((process.env.BUZZARD_RATE_LIMIT_STORE || "memory") === "redis") {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.BUZZARD_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.BUZZARD_REDIS_REST_TOKEN;
    if (!redisUrl || !redisToken) {
      warnings.push({
        code: "redis_store_not_configured",
        message: "BUZZARD_RATE_LIMIT_STORE=redis but Upstash credentials missing — memory fallback",
      });
    }
  }

  if (!process.env.REAL_SUPPLIER_API_KEY && !process.env.SUPPLIER_API_KEY) {
    warnings.push({
      code: "supplier_credentials_missing",
      message: "No supplier credentials configured (expected until real supplier connected)",
    });
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    failClosed: true,
    salesEnabled,
    goLiveLock,
    liveImportEnabled: isLiveImportEnabled(),
    timestamp: new Date().toISOString(),
  };
}

function assertSafeConfiguration() {
  const result = validateConfiguration();
  if (!result.ok) {
    const msg = result.errors.map((e) => e.message).join("; ");
    const err = new Error(`Configuration validation failed: ${msg}`);
    err.code = "configuration_validation_failed";
    err.details = result;
    throw err;
  }
  return result;
}

module.exports = {
  validateConfiguration,
  assertSafeConfiguration,
};
