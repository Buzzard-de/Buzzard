/**
 * Unit localization — canonical storage, localized display.
 */
const UNIT_FACTORS = Object.freeze({
  "mm->cm": 0.1,
  "cm->m": 0.01,
  "g->kg": 0.001,
  "mL->L": 0.001,
  "kW->HP": 1.34102,
  "kW->PS": 1.35962,
  "inch->mm": 25.4,
});

const UNIT_LABELS = Object.freeze({
  de: { mm: "mm", cm: "cm", m: "m", kg: "kg", g: "g", L: "L", mL: "mL", kW: "kW", HP: "PS", PS: "PS", inch: "Zoll", diesel: "Diesel" },
  en: { mm: "mm", cm: "cm", m: "m", kg: "kg", g: "g", L: "L", mL: "mL", kW: "kW", HP: "HP", PS: "PS", inch: "in", diesel: "Diesel" },
  tr: { mm: "mm", cm: "cm", m: "m", kg: "kg", g: "g", L: "L", mL: "mL", kW: "kW", HP: "BG", PS: "BG", inch: "inç", diesel: "Dizel" },
  ar: { mm: "مم", cm: "سم", m: "م", kg: "كغ", g: "غ", L: "ل", mL: "مل", kW: "كW", HP: "حصان", PS: "حصان", inch: "بوصة", diesel: "ديزل" },
});

function formatCanonicalAttribute(attr = {}) {
  const value = attr.canonicalValue ?? attr.value;
  const unit = attr.canonicalUnit || attr.unit;
  if (value == null) return null;
  return unit ? `${value} ${unit}` : String(value);
}

function localizeAttributeLabel(attr = {}, language = "de") {
  const labels = UNIT_LABELS[language] || UNIT_LABELS.de;
  return {
    key: attr.key,
    label: attr.localizedLabel?.[language] || attr.label || attr.key,
    value: attr.localizedValue?.[language] || attr.canonicalValue || attr.value,
    unitLabel: labels[attr.canonicalUnit || attr.unit] || attr.canonicalUnit || attr.unit || null,
    canonical: formatCanonicalAttribute(attr),
  };
}

function parseTireSize(size) {
  const match = String(size || "").match(/^(\d{3})\/(\d{2})\s*[rR]\s*(\d{2})\s*(.*)?$/);
  if (!match) return null;
  return {
    tireWidth: Number(match[1]),
    aspectRatio: Number(match[2]),
    rimDiameter: Number(match[3]),
    speedRating: String(match[4] || "").trim() || null,
  };
}

module.exports = {
  UNIT_FACTORS,
  UNIT_LABELS,
  formatCanonicalAttribute,
  localizeAttributeLabel,
  parseTireSize,
};
