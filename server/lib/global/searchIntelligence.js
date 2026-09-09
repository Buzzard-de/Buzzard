/**
 * Layered multilingual product search intelligence.
 */
const { normalizeSearchQuery, tokenizeQuery, normalizeIdentifierToken } = require("./searchNormalization");
const { mapQuerySynonyms, resolveCanonicalFromQuery, resolveCanonicalTerm } = require("./synonymEngine");
const { extractProductIdentity, compareIdentity } = require("./productIdentity");
const { filterProductsByCountry } = require("./countryAvailability");
const { parseVehicleSearchIntent, vehicleFitmentMatches } = require("./vehicleSearchIntelligence");

const SCORE_WEIGHTS = Object.freeze({
  productId: 1000,
  sku: 950,
  gtin: 900,
  ean: 900,
  mpn: 850,
  oem: 840,
  brandMpn: 820,
  supplierSku: 800,
  vehicleCompatibility: 780,
  canonicalTitle: 500,
  localizedTitle: 450,
  synonym: 300,
  category: 250,
  description: 100,
});

function scoreProductMatch(product, query, context = {}) {
  const normalizedQuery = normalizeSearchQuery(query);
  const tokens = tokenizeQuery(normalizedQuery);
  const identity = extractProductIdentity(product);
  let score = 0;
  const reasons = [];
  const isIdentifierQuery = /^\d{8,14}$/.test(normalizedQuery.replace(/\s+/g, ""));

  if (identity.productId && normalizedQuery === identity.productId.toLowerCase()) {
    score += SCORE_WEIGHTS.productId;
    reasons.push("exact_productId");
  }
  if (identity.sku && normalizeIdentifierToken(normalizedQuery) === normalizeIdentifierToken(identity.sku)) {
    score += SCORE_WEIGHTS.sku;
    reasons.push("exact_sku");
  }
  if (identity.gtin && normalizedQuery === identity.gtin) {
    score += SCORE_WEIGHTS.gtin;
    reasons.push("exact_gtin");
  }
  if (identity.ean && normalizedQuery === identity.ean) {
    score += SCORE_WEIGHTS.ean;
    reasons.push("exact_ean");
  }
  if (identity.mpn && normalizeIdentifierToken(normalizedQuery) === normalizeIdentifierToken(identity.mpn)) {
    score += SCORE_WEIGHTS.mpn;
    reasons.push("exact_mpn");
  }

  const oemRefs = product.oemReferences || [];
  if (oemRefs.length && normalizeIdentifierToken(normalizedQuery)) {
    const oemHit = oemRefs.some((ref) => normalizeIdentifierToken(ref) === normalizeIdentifierToken(normalizedQuery));
    if (oemHit) {
      score += SCORE_WEIGHTS.oem;
      reasons.push("exact_oem");
    }
  }

  const vehicleIntent = context.vehicleIntent || parseVehicleSearchIntent(normalizedQuery);
  if (vehicleIntent.hasVehicleIntent) {
    const fit = vehicleFitmentMatches(product, vehicleIntent);
    if (fit.match) {
      score += SCORE_WEIGHTS.vehicleCompatibility;
      reasons.push("vehicle_compatibility");
    }
  } else if (context.vehicleId && Array.isArray(product.compatibleVehicles)) {
    const fit = product.compatibleVehicles.some((v) => v.vehicleId === context.vehicleId);
    if (fit) {
      score += SCORE_WEIGHTS.vehicleCompatibility;
      reasons.push("vehicle_compatibility");
    }
  }

  if (!isIdentifierQuery) {
    const lang = context.language || "de";
    const localizedTitle = product.translations?.[lang]?.title || product.title || "";
    const canonicalTitle = product.title || "";
    const haystack = `${canonicalTitle} ${localizedTitle} ${product.brand || ""} ${product.description || ""}`.toLowerCase();

    for (const token of tokens) {
      if (haystack.includes(token)) score += SCORE_WEIGHTS.description;
      if (canonicalTitle.toLowerCase().includes(token)) score += SCORE_WEIGHTS.canonicalTitle;
      if (localizedTitle.toLowerCase().includes(token)) score += SCORE_WEIGHTS.localizedTitle;
      if (resolveCanonicalTerm(token)) score += SCORE_WEIGHTS.synonym;
    }

    if (vehicleIntent.hasVehicleIntent && vehicleIntent.make) {
      const brandHay = String(product.brand || "").toLowerCase();
      if (brandHay.includes(vehicleIntent.make)) {
        score += SCORE_WEIGHTS.canonicalTitle;
        reasons.push("vehicle_make_match");
      }
    }
  }

  if (context.categoryId && product.categoryId === context.categoryId) {
    score += SCORE_WEIGHTS.category;
    reasons.push("category_match");
  }

  return { product, score, reasons };
}

function searchProducts(products = [], query, context = {}) {
  const normalizedQuery = mapQuerySynonyms(normalizeSearchQuery(query));
  const countryFiltered = filterProductsByCountry(products, context.country || "DE", { searchMode: true });

  const ranked = countryFiltered
    .map((product) => scoreProductMatch(product, normalizedQuery, context))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return {
    query: normalizedQuery,
    country: context.country || "DE",
    language: context.language || "de",
    resultCount: ranked.length,
    results: ranked,
  };
}

function detectAutomotiveSearchIntent(query) {
  const vehicleIntent = parseVehicleSearchIntent(query);
  const detectedCategory = resolveCanonicalFromQuery(normalizeSearchQuery(query));
  return {
    detectedMake: vehicleIntent.make,
    detectedModel: vehicleIntent.model,
    detectedYear: vehicleIntent.year,
    detectedEngine: vehicleIntent.engine,
    detectedCategory,
    tokens: vehicleIntent.tokens,
    hasVehicleIntent: vehicleIntent.hasVehicleIntent,
  };
}

module.exports = {
  SCORE_WEIGHTS,
  scoreProductMatch,
  searchProducts,
  detectAutomotiveSearchIntent,
};
