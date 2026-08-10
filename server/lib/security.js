const path = require("path");

const SENSITIVE_KEY_PATTERN = /password|secret|token|authorization|credential|api_key/i;
const SAFE_ID_REGEX = /^[a-z0-9-]+$/i;

const LIMITS = {
  importPayloadBytes: 2 * 1024 * 1024,
  uploadMaxBytes: 5 * 1024 * 1024,
  csvMaxLines: 10000,
  jsonMaxRecords: 5000,
};

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded || req.socket?.remoteAddress || "unknown";
  return String(raw).split(",")[0].trim();
}

function createRateLimiter({ windowMs, max, keyPrefix = "" }) {
  const buckets = new Map();

  return function isRateLimited(req, options = {}) {
    const key = `${keyPrefix}${options.key || getClientIp(req)}`;
    const now = Date.now();
    const records = (buckets.get(key) || []).filter((ts) => now - ts < windowMs);
    if (records.length >= max) {
      buckets.set(key, records);
      return true;
    }
    records.push(now);
    buckets.set(key, records);
    return false;
  };
}

function setSecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  if (process.env.NODE_ENV === "production" || process.env.BUZZARD_HSTS === "1") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
}

function redactForLog(value, depth = 0) {
  if (depth > 5) return "[truncated]";
  if (value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => redactForLog(item, depth + 1));

  const output = {};
  for (const [key, nested] of Object.entries(value)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      output[key] = "[redacted]";
    } else {
      output[key] = redactForLog(nested, depth + 1);
    }
  }
  return output;
}

function publicErrorBody(errorKey = "security.internalError") {
  return { success: false, errorKey };
}

function isSafeId(id, maxLen = 64) {
  return typeof id === "string" && id.length > 0 && id.length <= maxLen && SAFE_ID_REGEX.test(id);
}

function normalizeText(value, max = 200) {
  return String(value || "")
    .trim()
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .slice(0, max);
}

function sanitizeFilename(filename) {
  const base = path.basename(String(filename || "upload"));
  if (!base || base === "." || base === "..") return null;
  if (/\.(exe|sh|bat|cmd|php|js|html|svg)$/i.test(base)) return null;
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

function validateImportPayload(body) {
  const format = String(body?.format || "json");
  if (!["json", "csv", "manual"].includes(format)) {
    return { ok: false, errorKey: "security.import.invalidFormat" };
  }

  if (format === "csv") {
    const csvText = String(body?.csvText || body?.payload || "");
    if (!csvText.trim()) return { ok: false, errorKey: "admin.import.failed" };
    if (Buffer.byteLength(csvText, "utf8") > LIMITS.importPayloadBytes) {
      return { ok: false, errorKey: "security.import.tooLarge" };
    }
    if (csvText.split(/\r?\n/).length > LIMITS.csvMaxLines) {
      return { ok: false, errorKey: "security.import.tooLarge" };
    }
    return { ok: true, format, payload: csvText };
  }

  const payload = body?.payload;
  if (format === "manual") {
    if (!payload || typeof payload !== "object") return { ok: false, errorKey: "admin.import.failed" };
    return { ok: true, format, payload };
  }

  const serialized = JSON.stringify(payload ?? body?.payload ?? []);
  if (Buffer.byteLength(serialized, "utf8") > LIMITS.importPayloadBytes) {
    return { ok: false, errorKey: "security.import.tooLarge" };
  }
  const records = Array.isArray(payload) ? payload : payload?.products || payload?.records || [payload];
  if (records.length > LIMITS.jsonMaxRecords) {
    return { ok: false, errorKey: "security.import.tooLarge" };
  }
  return { ok: true, format, payload };
}

function createDuplicateGuard(windowMs = 60_000) {
  const recent = new Map();

  return function isDuplicate(key) {
    const now = Date.now();
    for (const [existingKey, ts] of recent.entries()) {
      if (now - ts > windowMs) recent.delete(existingKey);
    }
    if (recent.has(key)) return true;
    recent.set(key, now);
    return false;
  };
}

module.exports = {
  LIMITS,
  getClientIp,
  createRateLimiter,
  setSecurityHeaders,
  redactForLog,
  publicErrorBody,
  isSafeId,
  normalizeText,
  sanitizeFilename,
  validateImportPayload,
  createDuplicateGuard,
};
