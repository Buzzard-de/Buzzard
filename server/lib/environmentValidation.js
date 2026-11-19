/**
 * Part 13 — Production environment validation (test mode separation)
 */

const { isProduction } = require("./runtimeEnv");

const WEAK_JWT_SECRETS = new Set(["DEV_ONLY_CHANGE_ME", "dev-secret-change-me"]);
const JWT_SECRET_MIN_LENGTH = 32;
const PLACEHOLDER_PATTERN = /change[-_ ]?me|example|placeholder|your[-_ ]?secret|secret[-_ ]?key|^(.)\1+$/i;

/** Reason a signing secret is unfit, or null. Never returns the value. */
function jwtSecretWeakness(value) {
  if (value.length < JWT_SECRET_MIN_LENGTH) return "shorter than 32 characters";
  if (WEAK_JWT_SECRETS.has(value) || PLACEHOLDER_PATTERN.test(value)) return "a placeholder value";
  // 32 random characters use well over 12 different symbols; a repeated word or a keyboard run does not.
  if (new Set(value).size < 12) return "too few different characters to be random";
  return null;
}

const BOOTSTRAP_ERRORS = {
  missing_credentials: {
    code: "admin_bootstrap_missing",
    message: "No administrator account exists: ADMIN_EMAIL and ADMIN_PASSWORD must be set for the first start",
  },
  invalid_email: { code: "admin_email_invalid", message: "ADMIN_EMAIL is not a valid e-mail address" },
  weak_password: {
    code: "admin_password_weak",
    message: "ADMIN_PASSWORD does not meet the administrator password rules (12+ characters, not a known default)",
  },
  store_unreadable: {
    code: "admin_store_unreadable",
    message: "admin-users.json exists but cannot be read; it was not replaced. Restore it from its backup before starting",
  },
};

function validateEnvironment() {
  const production = isProduction();
  const env = production ? "production" : process.env.NODE_ENV || "development";
  const errors = [];
  const warnings = [];

  if (production) {
    if (process.env.NODE_ENV !== "production") {
      warnings.push({
        code: "node_env_not_production",
        message: "Hosted runtime detected but NODE_ENV is not production; production rules are applied anyway",
      });
    }
    if (process.env.BUZZARD_TEST_MODE === "1") {
      errors.push({
        code: "test_mode_in_production",
        message: "BUZZARD_TEST_MODE=1 must not be set in production",
      });
    }
    if (process.env.BUZZARD_E2E_DB === "1") {
      errors.push({
        code: "e2e_db_in_production",
        message: "BUZZARD_E2E_DB=1 must not be set in production (synthetic catalog fixture)",
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
    const jwtSecret = String(process.env.JWT_SECRET || process.env.AUTH_SECRET || "");
    if (!jwtSecret) {
      errors.push({
        code: "jwt_secret_missing",
        message: "JWT_SECRET must be set in production",
      });
    } else if (jwtSecretWeakness(jwtSecret)) {
      errors.push({
        code: "jwt_secret_weak",
        message: `JWT_SECRET must be a random value of at least 32 characters in production (${jwtSecretWeakness(jwtSecret)})`,
      });
    }

    let bootstrap = { state: "existing" };
    try {
      const auth = require("./auth");
      bootstrap = auth.adminBootstrapStatus();
    } catch (err) {
      bootstrap = { state: "store_unreadable" };
      console.error("[env-validation] admin account check failed:", err.code || err.name);
    }
    if (BOOTSTRAP_ERRORS[bootstrap.state]) errors.push({ ...BOOTSTRAP_ERRORS[bootstrap.state] });

    const { trustedProxyHops } = require("./security");
    if (trustedProxyHops() === null) {
      warnings.push({
        code: "trusted_proxy_hops_unset",
        message:
          "BUZZARD_TRUSTED_PROXY_HOPS is not set: the client address is taken from the first X-Forwarded-For entry, which a client can choose",
      });
    }
    const webhooks = require("./webhookGate").describeConfiguration();
    const unusable = webhooks.filter((entry) => entry.rejected);
    if (unusable.length) {
      errors.push({
        code: "webhook_secret_weak",
        message: `Webhook secret too short or a placeholder (at least 32 random characters): ${unusable.map((entry) => entry.variable).join(", ")}`,
      });
    }
    const unset = webhooks.filter((entry) => !entry.configured && !entry.rejected);
    if (unset.length) {
      warnings.push({
        code: "webhook_secret_unset",
        message: `No webhook secret for: ${unset.map((entry) => entry.scope).join(", ")} — these webhook routes refuse every request`,
      });
    }

    // Accounts, sessions and the logs live in the data directory. Without a configured,
    // writable location they would start empty after every deploy.
    const dataDirProblem = require("./dataDir").productionDataDirProblem();
    if (dataDirProblem) errors.push(dataDirProblem);
    try {
      const health = require("./storeHealth").describeStores();
      const unhealthy = health.stores.filter((store) => !store.healthy);
      if (unhealthy.length) {
        warnings.push({
          code: "store_unhealthy",
          message: `Stores that need attention: ${unhealthy
            .map((store) => `${store.store} (${store.state}${store.invalidEntries ? `, ${store.invalidEntries} invalid` : ""}${store.chain && !store.chain.ok ? ", chain broken" : ""})`)
            .join(", ")}`,
        });
      }
      const exposed = health.stores.filter((store) => store.worldReadable);
      if (exposed.length) {
        warnings.push({
          code: "store_world_readable",
          message: `Store files readable by other users on the host: ${exposed.map((store) => store.store).join(", ")}`,
        });
      }
    } catch (err) {
      console.error("[env-validation] store check failed:", err.code || err.name);
    }

    let seedAccounts = [];
    try {
      seedAccounts = require("./auth").findSeedCredentialAccounts();
    } catch {
      seedAccounts = [];
    }
    if (seedAccounts.length) {
      errors.push({
        code: "default_admin_credentials",
        message: `${seedAccounts.length} admin account(s) still use a password from the committed seed file`,
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
    if (isProduction()) {
      throw new Error(`Environment validation failed: ${msg}`);
    }
  }
  for (const w of result.warnings) {
    console.warn("[env-validation]", w.message);
  }
  if (result.ok && isProduction()) {
    // Create the first administrator now, not during the first login attempt,
    // and only once everything else about the configuration is in order.
    require("./auth").seedProductionAdmin();
  }
  return result;
}

module.exports = {
  jwtSecretWeakness,
  validateEnvironment,
  assertProductionSafeStartup,
};
