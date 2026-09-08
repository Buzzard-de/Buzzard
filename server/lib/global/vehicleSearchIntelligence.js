/**
 * Automotive vehicle query parsing — no invented compatibility.
 */
const { normalizeSearchQuery, tokenizeQuery } = require("./searchNormalization");

const VEHICLE_MAKES = Object.freeze([
  "bmw", "mercedes", "mercedes-benz", "vw", "volkswagen", "audi", "ford", "opel", "toyota",
  "honda", "nissan", "renault", "peugeot", "citroen", "skoda", "seat", "fiat", "volvo",
  "porsche", "mini", "man", "iveco", "scania", "daf", "john", "deere", "case", "new holland",
]);

const MODEL_ALIASES = Object.freeze({
  "3er": "3 series",
  "3-series": "3 series",
  "golf": "golf",
  sprinter: "sprinter",
});

function parseVehicleSearchIntent(query) {
  const normalized = normalizeSearchQuery(query);
  const tokens = tokenizeQuery(normalized);
  const yearMatch = normalized.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? Number(yearMatch[0]) : null;

  let make = tokens.find((t) => VEHICLE_MAKES.includes(t)) || null;
  if (make === "mercedes-benz") make = "mercedes";
  if (make === "volkswagen") make = "vw";

  let model = null;
  for (const token of tokens) {
    if (MODEL_ALIASES[token]) {
      model = MODEL_ALIASES[token];
      break;
    }
    if (make && token !== make && !/^\d{4}$/.test(token) && token.length > 1) {
      model = token;
    }
  }

  const engineTokens = tokens.filter((t) => /^\d{2,3}d$/.test(t) || /^\d\.\d/.test(t));
  const engine = engineTokens[0] || null;

  return {
    make,
    model,
    year,
    engine,
    tokens,
    hasVehicleIntent: Boolean(make || model || year || engine),
  };
}

function vehicleFitmentMatches(product = {}, intent = {}) {
  const fitments = product.compatibleVehicles || [];
  if (!fitments.length || !intent.hasVehicleIntent) return { match: false, confidence: 0 };

  for (const fit of fitments) {
    const fitMake = String(fit.make || fit.manufacturer || "").toLowerCase();
    const fitModel = String(fit.model || "").toLowerCase();
    const yearFrom = Number(fit.yearFrom || fit.fromYear || 0);
    const yearTo = Number(fit.yearTo || fit.toYear || 9999);
    const fitEngine = String(fit.engine || "").toLowerCase();

    if (intent.make && fitMake && !fitMake.includes(intent.make) && intent.make !== fitMake) continue;

    if (intent.engine && fitEngine && fitEngine.includes(intent.engine)) {
      return { match: true, confidence: 0.9, fitment: fit, method: "engine" };
    }

    if (intent.model && fitModel && !fitModel.includes(intent.model) && !intent.model.includes(fitModel)) continue;
    if (intent.year && yearFrom && intent.year < yearFrom) continue;
    if (intent.year && yearTo && yearTo < 9999 && intent.year > yearTo) continue;

    return { match: true, confidence: 1, fitment: fit, method: "full" };
  }

  return { match: false, confidence: 0, status: "REVIEW_REQUIRED" };
}

module.exports = {
  VEHICLE_MAKES,
  parseVehicleSearchIntent,
  vehicleFitmentMatches,
};
