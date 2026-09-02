/**
 * Part 22 — Deterministic unit normalization (no guessing ambiguous units).
 */
const UNIT_ALIASES = Object.freeze({
  millimeter: "mm",
  millimeters: "mm",
  mm: "mm",
  centimeter: "cm",
  centimeters: "cm",
  cm: "cm",
  meter: "m",
  meters: "m",
  m: "m",
  gram: "g",
  grams: "g",
  g: "g",
  kilogram: "kg",
  kilograms: "kg",
  kg: "kg",
  milliliter: "ml",
  milliliters: "ml",
  ml: "ml",
  liter: "l",
  liters: "l",
  l: "l",
  piece: "pcs",
  pieces: "pcs",
  pcs: "pcs",
  pc: "pcs",
  stk: "pcs",
  stück: "pcs",
});

const AMBIGUOUS_UNITS = new Set(["m", "l", "g"]);

function normalizeUnit(value, { fieldImportance = "standard" } = {}) {
  const raw = String(value || "").trim();
  if (!raw) {
    return { ok: false, raw: "", normalized: null, unknown: true, ambiguous: false };
  }

  const key = raw.toLowerCase().replace(/\./g, "").trim();
  const normalized = UNIT_ALIASES[key];
  if (!normalized) {
    return {
      ok: false,
      raw,
      normalized: null,
      unknown: true,
      ambiguous: false,
      status: fieldImportance === "critical" ? "BLOCKED" : "CONDITION",
    };
  }

  const ambiguous = AMBIGUOUS_UNITS.has(normalized) && key.length === 1;
  if (ambiguous) {
    return {
      ok: false,
      raw,
      normalized,
      unknown: false,
      ambiguous: true,
      status: fieldImportance === "critical" ? "BLOCKED" : "CONDITION",
    };
  }

  return { ok: true, raw, normalized, unknown: false, ambiguous: false, status: "PASS" };
}

module.exports = {
  normalizeUnit,
  UNIT_ALIASES,
};
