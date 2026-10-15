/**
 * Part 13 — Production environment validation (test mode separation)
 */

function validateEnvironment() {
  const env = process.env.NODE_ENV || "development";
  const errors = [];
  const warnings = [];

  if (env === "production") {
    if (process.env.BUZZARD_TEST_MODE === "1") {
      errors.push({
        code: "test_mode_in_production",
        message: "BUZZARD_TEST_MODE=1 must not be set in production",
      });
    }
    if (process.env.BUZZARD_RATE_LIMIT_DISABLED === "1") {
      errors.push({
        code: "rate_limit_disabled_in_production",
        message: "BUZZARD_RATE_LIMIT_DISABLED=1 must not be set in production",
      });
    }
    if (process.env.BUZZARD_SALES_ENABLED === "1") {
      warnings.push({
        code: "sales_enabled_in_production",
        message: "BUZZARD_SALES_ENABLED=1 — commercial sales active",
      });
    }
    if (process.env.BUZZARD_LIVE_PAYMENTS === "1" && process.env.BUZZARD_SALES_ENABLED !== "1") {
      errors.push({
        code: "live_payments_without_sales",
        message: "BUZZARD_LIVE_PAYMENTS=1 is invalid while BUZZARD_SALES_ENABLED is not 1",
      });
    }
    if (process.env.BUZZARD_LIVE_PAYMENTS === "1" && process.env.BUZZARD_SALES_ENABLED === "1") {
      warnings.push({
        code: "live_payments_armed_in_production",
        message: "BUZZARD_LIVE_PAYMENTS=1 with sales enabled — live money movement possible; human authorization required",
      });
    }
    if (process.env.BUZZARD_PRODUCT_SOT_ACTIVE === "1") {
      warnings.push({
        code: "product_sot_env_flag_set",
        message: "BUZZARD_PRODUCT_SOT_ACTIVE=1 — Product SoT remains software-inactive until independent human approval",
      });
    }
    const jwtSecret = process.env.JWT_SECRET || process.env.AUTH_SECRET || "";
    const defaultSecrets = new Set(["", "dev-secret-change-me", "DEV_ONLY_CHANGE_ME"]);
    if (defaultSecrets.has(jwtSecret)) {
      errors.push({
        code: "default_jwt_secret",
        message: "JWT_SECRET must be set to a unique non-default value in production",
      });
    }
  }

  return {
    ok: errors.length === 0,
    environment: env,
    errors,
    warnings,
    testMode: process.env.BUZZARD_TEST_MODE === "1",
    salesEnabled: process.env.BUZZARD_SALES_ENABLED === "1",
    livePayments: process.env.BUZZARD_LIVE_PAYMENTS === "1",
    productSotEnvFlag: process.env.BUZZARD_PRODUCT_SOT_ACTIVE === "1",
  };
}

function assertProductionSafeStartup() {
  const result = validateEnvironment();
  if (!result.ok) {
    const codes = result.errors.map((e) => e.code).join("; ");
    console.error("[env-validation] FATAL:", codes);
    if (process.env.NODE_ENV === "production") {
      const err = new Error(`Environment validation failed: ${codes}`);
      err.code = "environment.validation_failed";
      throw err;
    }
  }
  for (const w of result.warnings) {
    console.warn("[env-validation]", w.code);
  }
  return result;
}

module.exports = {
  validateEnvironment,
  assertProductionSafeStartup,
};
