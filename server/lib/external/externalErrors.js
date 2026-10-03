"use strict";

const CANONICAL = Object.freeze({
  AUTH_ERROR: "AUTH_ERROR",
  RATE_LIMITED: "RATE_LIMITED",
  TIMEOUT: "TIMEOUT",
  NETWORK_ERROR: "NETWORK_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  SERVER_ERROR: "SERVER_ERROR",
  UNSUPPORTED: "UNSUPPORTED",
  UNKNOWN: "UNKNOWN",
});

const SECRET_KEYS = /api[_-]?key|secret|token|password|authorization|bearer/i;

function sanitize(value) {
  if (value == null) return value;
  if (typeof value === "string") {
    if (SECRET_KEYS.test(value) || value.length > 240) return "[REDACTED]";
    return value;
  }
  if (Array.isArray(value)) return value.map(sanitize);
  if (typeof value === "object") {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = SECRET_KEYS.test(key) ? "[REDACTED]" : sanitize(val);
    }
    return out;
  }
  return value;
}

function normalizeExternalError(error = {}) {
  const raw = String(error.code || error.message || "unknown").toLowerCase();
  let code = CANONICAL.UNKNOWN;
  if (raw.includes("auth") || raw.includes("401") || raw.includes("403")) code = CANONICAL.AUTH_ERROR;
  else if (raw.includes("rate") || raw.includes("429")) code = CANONICAL.RATE_LIMITED;
  else if (raw.includes("timeout")) code = CANONICAL.TIMEOUT;
  else if (raw.includes("network") || raw.includes("econn") || raw.includes("enotfound")) code = CANONICAL.NETWORK_ERROR;
  else if (raw.includes("valid")) code = CANONICAL.VALIDATION_ERROR;
  else if (raw.includes("not_found") || raw.includes("404")) code = CANONICAL.NOT_FOUND;
  else if (raw.includes("conflict") || raw.includes("409")) code = CANONICAL.CONFLICT;
  else if (raw.includes("500") || raw.includes("server")) code = CANONICAL.SERVER_ERROR;
  else if (raw.includes("unsupported")) code = CANONICAL.UNSUPPORTED;
  return {
    code,
    message: "external_error",
    retryable: code === CANONICAL.TIMEOUT || code === CANONICAL.RATE_LIMITED || code === CANONICAL.NETWORK_ERROR,
    details: sanitize(error.details || null),
  };
}

module.exports = { CANONICAL, sanitize, normalizeExternalError };
