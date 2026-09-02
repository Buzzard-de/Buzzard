/**
 * Part 22 — Deterministic SKU normalization (preserves original).
 */
const SKU_ILLEGAL = /[^a-zA-Z0-9._\-/]/g;

function normalizeSku(value) {
  const original = String(value || "").trim();
  if (!original) {
    return { ok: false, original: "", normalized: "", changed: false, reason: "missing_sku" };
  }

  let normalized = original.replace(/\s+/g, " ").trim();
  normalized = normalized.replace(/[-_/]{2,}/g, (m) => m[0]);
  normalized = normalized.replace(SKU_ILLEGAL, "");

  if (!normalized) {
    return { ok: false, original, normalized: "", changed: true, reason: "empty_after_normalization" };
  }

  if (normalized.length > 128) {
    return { ok: false, original, normalized, changed: normalized !== original, reason: "sku_too_long" };
  }

  if (/^(mock|demo|test|sample|placeholder)/i.test(normalized)) {
    return { ok: false, original, normalized, changed: normalized !== original, reason: "placeholder_sku" };
  }

  return {
    ok: true,
    original,
    normalized,
    changed: normalized !== original,
  };
}

module.exports = {
  normalizeSku,
};
