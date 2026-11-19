/**
 * Shape checks for webhook payloads. A valid signature says who sent the
 * request, not that every field is well-formed.
 */
const TOKEN = /^[A-Za-z][A-Za-z0-9_.-]{0,39}$/;

/** Status-like value: one short word. Returns null when it is anything else. */
function token(value) {
  return typeof value === "string" && TOKEN.test(value.trim()) ? value.trim() : null;
}

/** Free text, trimmed and capped; control characters removed. */
function text(value, max = 200) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string" && typeof value !== "number") return null;
  // eslint-disable-next-line no-control-regex
  return String(value).replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
}

/** Identifier from the sender: printable, no spaces, at most 128 characters. */
function identifier(value) {
  if (typeof value === "number" && Number.isSafeInteger(value)) return String(value);
  return typeof value === "string" && /^[\x21-\x7e]{1,128}$/.test(value.trim()) ? value.trim() : null;
}

/** Money amount: finite, not negative, at most 10 million. Returns null otherwise. */
function amount(value, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback;
  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
  return Number.isFinite(number) && number >= 0 && number <= 10_000_000 ? number : null;
}

function currency(value, fallback = "EUR") {
  if (value === undefined || value === null || value === "") return fallback;
  return typeof value === "string" && /^[A-Za-z]{3}$/.test(value) ? value.toUpperCase() : null;
}

/** ISO timestamp, or the fallback when none was sent. Returns null when it is not a date. */
function timestamp(value, fallback = new Date().toISOString()) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string" || value.length > 40) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

const INVALID = Object.freeze({ error: "Invalid webhook payload", status: 400 });

module.exports = { token, text, identifier, amount, currency, timestamp, INVALID };
