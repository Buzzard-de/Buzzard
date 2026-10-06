/**
 * Zero-result search intelligence — suggestions only, no fabricated products.
 */
const { normalizeSearchQuery, tokenizeQuery } = require("./searchNormalization");
const { getSynonymSuggestions, resolveCanonicalFromQuery } = require("./synonymEngine");
const { detectAutomotiveSearchIntent } = require("./searchIntelligence");

function buildZeroResultResponse(query, context = {}) {
  const normalizedQuery = normalizeSearchQuery(query);
  const tokens = tokenizeQuery(normalizedQuery);
  const automotive = detectAutomotiveSearchIntent(normalizedQuery);
  const suggestedSynonyms = [];
  const suggestedCategories = [];

  const phraseCategory = resolveCanonicalFromQuery(normalizedQuery);
  if (phraseCategory) suggestedCategories.push(phraseCategory);

  for (const token of tokens) {
    suggestedSynonyms.push(...getSynonymSuggestions(token));
    const canonical = resolveCanonicalFromQuery(token);
    if (canonical) suggestedCategories.push(canonical);
  }

  return {
    normalizedQuery,
    detectedLanguage: context.language || "de",
    detectedCountry: context.country || "DE",
    detectedCategory: automotive.detectedCategory,
    detectedVehicle: automotive.detectedMake
      ? { make: automotive.detectedMake, status: "SUGGESTED_NOT_CONFIRMED" }
      : null,
    suggestedCategories: [...new Set(suggestedCategories)],
    suggestedSynonyms: [...new Set(suggestedSynonyms)],
    products: [],
    fabricatedProducts: false,
    status: "ZERO_RESULTS",
  };
}

module.exports = {
  buildZeroResultResponse,
};
