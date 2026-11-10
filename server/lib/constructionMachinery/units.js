/**
 * Explicit unit conversion. Never silently compare incompatible units.
 * Original values are preserved by callers; this module only converts when asked.
 */

const LENGTH_TO_MM = Object.freeze({
  mm: 1,
  centimeter: 10,
  cm: 10,
  m: 1000,
  meter: 1000,
  inch: 25.4,
  in: 25.4,
  ft: 304.8,
});

const MASS_TO_G = Object.freeze({
  g: 1,
  gram: 1,
  kg: 1000,
  kilogram: 1000,
  lb: 453.59237,
  pound: 453.59237,
});

const PRESSURE_TO_BAR = Object.freeze({
  bar: 1,
  mpa: 10,
  psi: 0.0689475729,
  kpa: 0.01,
});

const FAMILIES = Object.freeze({
  length: LENGTH_TO_MM,
  mass: MASS_TO_G,
  pressure: PRESSURE_TO_BAR,
});

function normalizeUnit(unit) {
  return String(unit || "")
    .trim()
    .toLowerCase()
    .replace(/\./g, "");
}

function familyFor(unit) {
  const key = normalizeUnit(unit);
  for (const [family, table] of Object.entries(FAMILIES)) {
    if (table[key] !== undefined) return family;
  }
  return null;
}

function convertUnit(value, fromUnit, toUnit) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return { ok: false, error: "invalid_value" };
  }
  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);
  if (!from || !to) return { ok: false, error: "missing_unit" };
  if (from === to) {
    return { ok: true, value: amount, from, to, converted: false };
  }
  const fromFamily = familyFor(from);
  const toFamily = familyFor(to);
  if (!fromFamily || !toFamily) return { ok: false, error: "unknown_unit" };
  if (fromFamily !== toFamily) {
    return { ok: false, error: "incompatible_units", fromFamily, toFamily };
  }
  const table = FAMILIES[fromFamily];
  const canonical = amount * table[from];
  const converted = canonical / table[to];
  return {
    ok: true,
    value: converted,
    from,
    to,
    family: fromFamily,
    converted: true,
  };
}

function compareCompatible(aValue, aUnit, bValue, bUnit) {
  const converted = convertUnit(aValue, aUnit, bUnit);
  if (!converted.ok) return converted;
  const left = converted.value;
  const right = Number(bValue);
  if (!Number.isFinite(right)) return { ok: false, error: "invalid_value" };
  return { ok: true, equal: left === right, delta: left - right, unit: normalizeUnit(bUnit) };
}

module.exports = {
  convertUnit,
  compareCompatible,
  familyFor,
  normalizeUnit,
};
