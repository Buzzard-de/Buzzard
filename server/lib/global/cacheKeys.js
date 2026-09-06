/**
 * Cache key isolation — country + language + currency + query + vehicle context.
 */
function buildSearchCacheKey(params = {}) {
  const parts = [
    "search",
    String(params.country || "DE").toUpperCase(),
    String(params.language || "de").toLowerCase(),
    String(params.currency || "EUR").toUpperCase(),
    String(params.query || "").trim().toLowerCase(),
    String(params.categoryId || ""),
    String(params.vehicleId || ""),
  ];
  return parts.join(":");
}

function buildLocaleConfigCacheKey(country, language) {
  return `locale:${String(country || "DE").toUpperCase()}:${String(language || "de").toLowerCase()}`;
}

module.exports = {
  buildSearchCacheKey,
  buildLocaleConfigCacheKey,
};
