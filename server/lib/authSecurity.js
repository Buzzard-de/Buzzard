const { createRateLimiter, getClientIp, normalizeText } = require("./security");
const { logSecurityEvent } = require("./securityLog");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

const authLoginLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyPrefix: "auth-login:",
});

const authRegisterLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyPrefix: "auth-register:",
});

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase().slice(0, 254);
}

function isValidEmail(email) {
  const normalized = normalizeEmail(email);
  return normalized.length > 0 && EMAIL_REGEX.test(normalized);
}

function isValidPassword(password) {
  return (
    typeof password === "string" &&
    password.length >= PASSWORD_MIN &&
    password.length <= PASSWORD_MAX
  );
}

function isValidName(name) {
  const normalized = normalizeText(name, 100);
  return normalized.length >= 2;
}

function enforceAuthRateLimit(req, res, { scope, email, path }) {
  const ip = getClientIp(req);
  const normalizedEmail = normalizeEmail(email);
  const limiter = scope === "register" ? authRegisterLimit : authLoginLimit;
  const key = `${ip}:${normalizedEmail || "unknown"}`;

  if (limiter(req, { key })) {
    logSecurityEvent({
      type: scope === "register" ? "auth_register_rate_limited" : "auth_login_rate_limited",
      success: false,
      ip,
      email: normalizedEmail || null,
      path,
    });
    res.status(429).json({ error: "Too many attempts. Please try again later." });
    return false;
  }

  return true;
}

function logAuthFailure(req, { type, email, path }) {
  logSecurityEvent({
    type,
    success: false,
    ip: getClientIp(req),
    email: normalizeEmail(email) || null,
    path,
  });
}

module.exports = {
  normalizeEmail,
  isValidEmail,
  isValidPassword,
  isValidName,
  enforceAuthRateLimit,
  logAuthFailure,
};
