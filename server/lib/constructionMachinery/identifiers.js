/**
 * Conservative part-number normalization.
 * Always keep the original representation. Never invent a manufacturer number.
 */

const DEFAULT_STRIP = /[\s\-./_]+/g;

const MANUFACTURER_RULES = Object.freeze({
  fixtureworks: {
    strip: /[\s\-./_]+/g,
    uppercase: true,
  },
  mockoem: {
    strip: /[\s\-./_]+/g,
    uppercase: true,
  },
});

function originalPartNumber(value) {
  return String(value ?? "").trim();
}

function manufacturerKey(manufacturer) {
  return String(manufacturer || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function normalizePartNumber(value, manufacturer) {
  const original = originalPartNumber(value);
  if (!original) {
    return { original: "", normalized: "", valid: false, reason: "empty" };
  }
  if (original.length > 80) {
    return { original, normalized: "", valid: false, reason: "too_long" };
  }
  if (/[=+\-@|]/.test(original[0]) || /^(?:=|\+|@)/.test(original)) {
    return { original, normalized: "", valid: false, reason: "formula_injection" };
  }

  const rule = MANUFACTURER_RULES[manufacturerKey(manufacturer)] || {
    strip: DEFAULT_STRIP,
    uppercase: true,
  };
  let normalized = original.replace(rule.strip, "");
  if (rule.uppercase) normalized = normalized.toUpperCase();
  if (!/^[A-Z0-9]+$/i.test(normalized)) {
    return { original, normalized, valid: false, reason: "invalid_charset" };
  }
  return { original, normalized, valid: true };
}

function numbersEqual(a, b, manufacturer) {
  const left = normalizePartNumber(a, manufacturer);
  const right = normalizePartNumber(b, manufacturer);
  return Boolean(left.valid && right.valid && left.normalized === right.normalized);
}

function stableId(prefix, parts) {
  const raw = parts
    .map((part) => String(part || "").trim().toLowerCase())
    .filter(Boolean)
    .join(":");
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}-${(hash >>> 0).toString(16)}`;
}

module.exports = {
  originalPartNumber,
  normalizePartNumber,
  numbersEqual,
  manufacturerKey,
  stableId,
};
