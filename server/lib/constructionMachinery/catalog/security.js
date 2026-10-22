const { MAX_PAYLOAD_BYTES, MAX_IMPORT_RECORDS, ERROR_CLASS } = require("../constants");

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "169.254.169.254",
  "metadata.google.internal",
]);

function rejectFormula(value) {
  const text = String(value ?? "");
  if (/^[=+\-@|]/.test(text.trim())) {
    return { ok: false, error: "formula_injection", class: ERROR_CLASS.SECURITY };
  }
  return { ok: true, value: text };
}

function sanitizeText(value, max = 500) {
  const checked = rejectFormula(value);
  if (!checked.ok) return checked;
  return { ok: true, value: checked.value.replace(/[<>]/g, "").slice(0, max) };
}

function assertPayloadSize(payload) {
  const size = Buffer.byteLength(typeof payload === "string" ? payload : JSON.stringify(payload || {}));
  if (size > MAX_PAYLOAD_BYTES) {
    return { ok: false, error: "payload_too_large", class: ERROR_CLASS.SECURITY, size };
  }
  return { ok: true, size };
}

function assertRecordLimit(records) {
  if (!Array.isArray(records)) return { ok: false, error: "records_not_array", class: ERROR_CLASS.VALIDATION };
  if (records.length > MAX_IMPORT_RECORDS) {
    return { ok: false, error: "too_many_records", class: ERROR_CLASS.SECURITY, count: records.length };
  }
  return { ok: true, count: records.length };
}

function assertSafeRemoteUrl(url) {
  if (!url) return { ok: false, error: "missing_url", class: ERROR_CLASS.VALIDATION };
  let parsed;
  try {
    parsed = new URL(String(url));
  } catch {
    return { ok: false, error: "invalid_url", class: ERROR_CLASS.SECURITY };
  }
  if (!["https:", "http:"].includes(parsed.protocol)) {
    return { ok: false, error: "blocked_protocol", class: ERROR_CLASS.SECURITY };
  }
  const host = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host) || host.endsWith(".internal") || host.endsWith(".local")) {
    return { ok: false, error: "ssrf_blocked", class: ERROR_CLASS.SECURITY };
  }
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(host)) {
    return { ok: false, error: "ssrf_blocked", class: ERROR_CLASS.SECURITY };
  }
  return { ok: true, url: parsed.toString() };
}

function stripXmlDoctype(xml) {
  const text = String(xml || "");
  if (/<!DOCTYPE/i.test(text) || /<!ENTITY/i.test(text) || /SYSTEM\s+"/i.test(text)) {
    return { ok: false, error: "xxe_rejected", class: ERROR_CLASS.SECURITY };
  }
  return { ok: true, value: text };
}

function safeArchiveName(name) {
  const base = String(name || "").replace(/\\/g, "/").split("/").pop();
  if (!base || base.includes("..")) {
    return { ok: false, error: "unsafe_path", class: ERROR_CLASS.SECURITY };
  }
  return { ok: true, value: base };
}

module.exports = {
  rejectFormula,
  sanitizeText,
  assertPayloadSize,
  assertRecordLimit,
  assertSafeRemoteUrl,
  stripXmlDoctype,
  safeArchiveName,
};
