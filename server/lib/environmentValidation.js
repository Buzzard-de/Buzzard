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
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "dev-secret-change-me") {
      warnings.push({
        code: "default_jwt_secret",
        message: "JWT_SECRET should be set to a strong value in production",
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
  };
}

function assertProductionSafeStartup() {
  const result = validateEnvironment();
  if (!result.ok) {
    const msg = result.errors.map((e) => e.message).join("; ");
    console.error("[env-validation] FATAL:", msg);
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Environment validation failed: ${msg}`);
    }
  }
  for (const w of result.warnings) {
    console.warn("[env-validation]", w.message);
  }
  return result;
}

module.exports = {
  validateEnvironment,
  assertProductionSafeStartup,
};
