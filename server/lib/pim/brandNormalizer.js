/**
 * Part 22 — Deterministic brand/manufacturer normalization (alias map only).
 */
const BRAND_ALIASES = Object.freeze({
  "bmw ag": "BMW",
  bmw: "BMW",
  "mercedes-benz ag": "Mercedes-Benz",
  "mercedes-benz": "Mercedes-Benz",
  mercedes: "Mercedes-Benz",
  "volkswagen ag": "Volkswagen",
  volkswagen: "Volkswagen",
  vw: "Volkswagen",
  ate: "ATE",
  bosch: "Bosch",
  febi: "Febi Bilstein",
  "febi bilstein": "Febi Bilstein",
});

function normalizeBrand(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return { ok: false, raw: "", normalized: null, canonical: false, unknown: true };
  }

  const key = raw.toLowerCase().replace(/\s+/g, " ").trim();
  if (BRAND_ALIASES[key]) {
    return {
      ok: true,
      raw,
      normalized: BRAND_ALIASES[key],
      canonical: true,
      unknown: false,
    };
  }

  return {
    ok: true,
    raw,
    normalized: raw,
    canonical: false,
    unknown: true,
  };
}

module.exports = {
  normalizeBrand,
  BRAND_ALIASES,
};
