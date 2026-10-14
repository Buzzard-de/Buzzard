/**
 * JWT secret resolution. Production fails closed on empty or documented defaults.
 * Does not log or return caller-supplied secrets beyond the resolved value.
 */

const UNSAFE_DEFAULTS = new Set(["", "dev-secret-change-me", "DEV_ONLY_CHANGE_ME"]);

function isUnsafeJwtSecret(value) {
  return UNSAFE_DEFAULTS.has(String(value || ""));
}

function resolveJwtSecret(env = process.env) {
  const value = env.JWT_SECRET || env.AUTH_SECRET || "";
  if (env.NODE_ENV === "production" && isUnsafeJwtSecret(value)) {
    const error = new Error("JWT_SECRET must be set to a unique non-default value in production");
    error.code = "default_jwt_secret";
    throw error;
  }
  return value || "DEV_ONLY_CHANGE_ME";
}

module.exports = {
  UNSAFE_DEFAULTS,
  isUnsafeJwtSecret,
  resolveJwtSecret,
};
