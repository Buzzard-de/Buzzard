/**
 * Automotive Core — search bridge (extends existing searchIntelligence, no duplicate engine).
 */
const tireEngine = require("./tireEngine");
const { parseVehicleSearchIntent } = require("../../lib/global/vehicleSearchIntelligence");
const categoryEngine = require("./categoryEngine");

function parseAutomotiveSearchIntent(query) {
  const text = String(query || "").trim();
  const tire = tireEngine.extractTireFromQuery(text);
  const vehicle = parseVehicleSearchIntent(text);

  let remaining = text;
  if (tire?.raw) remaining = remaining.replace(tire.raw, " ").trim();

  const oilMatch = remaining.match(/\b(\d{1,2}W-\d{2})\b/i);
  const mpnMatch = remaining.match(/\b([A-Z0-9][A-Z0-9.\-/]{4,})\b/i);
  const categoryHint = detectCategoryHint(text);

  return {
    raw: text,
    tire: tire || null,
    vehicle: vehicle.hasVehicleIntent ? vehicle : null,
    oil: oilMatch ? { viscosity: oilMatch[1].toUpperCase() } : null,
    partNumber: mpnMatch ? mpnMatch[1] : null,
    categoryHint,
    hasAutomotiveIntent: Boolean(tire || vehicle.hasVehicleIntent || oilMatch || categoryHint),
  };
}

function detectCategoryHint(query) {
  const q = String(query || "").toLowerCase();
  const hints = [
    { id: "tires_wheels", patterns: ["reifen", "tire", "lastik", "205/", "r16", "r17", "felgen", "jant"] },
    { id: "brakes", patterns: ["bremse", "brake", "fren", "bremsbelag", "brake pad"] },
    { id: "oils_fluids", patterns: ["öl", "oil", "yağ", "5w-", "0w-", "motoröl"] },
    { id: "batteries_electrical", patterns: ["batterie", "battery", "akü", "alternator"] },
    { id: "motorcycles_scooters", patterns: ["motorrad", "motorcycle", "motosiklet", "scooter"] },
  ];
  for (const hint of hints) {
    if (hint.patterns.some((p) => q.includes(p))) return hint.id;
  }
  return null;
}

function getCategorySearchRules(categoryId) {
  return categoryEngine.getSearchRulesForCategory(categoryId);
}

module.exports = {
  parseAutomotiveSearchIntent,
  detectCategoryHint,
  getCategorySearchRules,
};
