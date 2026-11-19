const path = require("path");

const SENSITIVE_KEY_PATTERN =
  /password|passwd|passphrase|^pass$|secret|token|authorization|credential|api[_-]?key|cookie|signature|private[_-]?key|totp|^otp$|otp[_-]?code|^cvv$|^cvc$|card[_-]?number|^iban$|recovery[_-]?code/i;
// Values that are credentials whatever the key is called.
const SENSITIVE_VALUE_PATTERNS = [
  [/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, "Bearer [redacted]"],
  [/\beyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]*/g, "[redacted-jwt]"],
  [/\b[a-f0-9]{64}\b/gi, "[redacted-token]"],
  [/\b(?:scrypt|pbkdf2|argon2\w*)[$:][^\s"']{16,}/gi, "[redacted-hash]"],
  [/\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/g, "[redacted-hash]"],
];
const MAX_LOG_STRING = 2000;

function redactString(value) {
  let text = value.length > MAX_LOG_STRING ? `${value.slice(0, MAX_LOG_STRING)}…[truncated]` : value;
  for (const [pattern, replacement] of SENSITIVE_VALUE_PATTERNS) text = text.replace(pattern, replacement);
  return text;
}
const SAFE_ID_REGEX = /^[a-z0-9-]+$/i;

const LIMITS = {
  importPayloadBytes: 2 * 1024 * 1024,
  uploadMaxBytes: 5 * 1024 * 1024,
  csvMaxLines: 10000,
  jsonMaxRecords: 5000,
};

function normalizeIp(value) {
  const ip = String(value || "").trim().replace(/^::ffff:/i, "");
  // Anything that is not an address would end up in limiter keys and log lines.
  return /^[0-9a-f:.]{2,45}$/i.test(ip) ? ip : "unknown";
}

function trustedProxyHops() {
  const raw = String(process.env.BUZZARD_TRUSTED_PROXY_HOPS ?? "").trim();
  if (!/^\d{1,2}$/.test(raw)) return null;
  return Number(raw);
}

/**
 * Address of the client as far as it can be trusted.
 *
 * X-Forwarded-For is written by the client first and extended by every proxy,
 * so only the entries added by our own proxies are reliable. With
 * BUZZARD_TRUSTED_PROXY_HOPS=N the address is the Nth entry from the right
 * (the one added by the outermost proxy we operate); 0 ignores the header and
 * uses the socket address. Unset keeps the previous behaviour, the leftmost
 * entry, which a client can choose freely: production warns about that.
 */
function getClientIp(req) {
  const socketIp = normalizeIp(req?.socket?.remoteAddress);
  const header = req?.headers?.["x-forwarded-for"];
  const forwarded = (Array.isArray(header) ? header.join(",") : String(header || ""))
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const hops = trustedProxyHops();
  if (hops === 0 || forwarded.length === 0) return socketIp;
  if (hops === null) return normalizeIp(forwarded[0]);
  if (forwarded.length < hops) return socketIp;
  return normalizeIp(forwarded[forwarded.length - hops]);
}

const { createRateLimiter, getStoreInfo } = require("./rateLimitStore");

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
  if (process.env.BUZZARD_CSP !== "0") {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
    );
  }
}

function redactForLog(value, depth = 0) {
  if (depth > 5) return "[truncated]";
  if (typeof value === "string") return redactString(value);
  if (value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => redactForLog(item, depth + 1));

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

/**
 * An e-mail address as it is kept in logs: enough to recognise an account,
 * not enough to write to it. Anything that is not an address is not kept at
 * all, because people do type passwords into the wrong field.
 */
function maskEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  if (!email) return null;
  const match = /^([^\s@]{1,64})@([^\s@]{1,253})$/.exec(email);
  if (!match) return "[not an address]";
  return `${match[1].slice(0, 2)}***@${match[2]}`;
}

/** Stable reference for an address, so log entries about one account can be found without storing it. */
function emailReference(value) {
  const email = String(value || "").trim().toLowerCase();
  if (!/^[^\s@]{1,64}@[^\s@]{1,253}$/.test(email)) return null;
  return require("crypto").createHash("sha256").update(`buzzard-log-ref:${email}`).digest("hex").slice(0, 16);
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
  trustedProxyHops,
  createRateLimiter,
  setSecurityHeaders,
  redactForLog,
  maskEmail,
  emailReference,
  publicErrorBody,
  isSafeId,
  normalizeText,
  sanitizeFilename,
  validateImportPayload,
  createDuplicateGuard,
  getStoreInfo,
};
