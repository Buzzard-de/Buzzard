/**
 * Controlled synonym engine — improves search, never overrides GTIN/EAN/MPN.
 */
const synonymsData = require("../../../data/global/category_synonyms.json");

const CANONICAL_BY_SYNONYM = new Map();
const SYNONYMS_BY_CANONICAL = new Map();

for (const entry of synonymsData) {
  const canonical = entry.canonical;
  const synonyms = entry.synonyms || [];
  SYNONYMS_BY_CANONICAL.set(canonical, synonyms);
  CANONICAL_BY_SYNONYM.set(canonical.toLowerCase(), canonical);
  for (const synonym of synonyms) {
    CANONICAL_BY_SYNONYM.set(String(synonym).toLowerCase(), canonical);
  }
}

function resolveCanonicalTerm(term) {
  const key = String(term || "").trim().toLowerCase();
  return CANONICAL_BY_SYNONYM.get(key) || null;
}

function expandSynonyms(term) {
  const canonical = resolveCanonicalTerm(term) || term;
  const synonyms = SYNONYMS_BY_CANONICAL.get(canonical) || [];
  return [canonical, ...synonyms];
}

function mapQuerySynonyms(query) {
  const normalized = String(query || "").trim().toLowerCase();
  for (const [synonym, canonical] of CANONICAL_BY_SYNONYM.entries()) {
    if (synonym.includes(" ") && normalized.includes(synonym)) {
      return normalized.replace(synonym, canonical.toLowerCase());
    }
  }

  const tokens = normalized.split(/\s+/).filter(Boolean);
  const mapped = tokens.map((token) => resolveCanonicalTerm(token) || token);
  return mapped.join(" ");
}

function resolveCanonicalFromQuery(query) {
  const normalized = String(query || "").trim().toLowerCase();
  for (const [synonym, canonical] of CANONICAL_BY_SYNONYM.entries()) {
    if (normalized === synonym || normalized.includes(synonym)) {
      return canonical;
    }
  }
  for (const token of normalized.split(/\s+/)) {
    const hit = resolveCanonicalTerm(token);
    if (hit) return hit;
  }
  return null;
}

function getSynonymSuggestions(query) {
  const canonical = resolveCanonicalTerm(query);
  if (!canonical) return [];
  return expandSynonyms(canonical).filter((s) => s.toLowerCase() !== String(query).toLowerCase());
}

module.exports = {
  resolveCanonicalTerm,
  expandSynonyms,
  mapQuerySynonyms,
  resolveCanonicalFromQuery,
  getSynonymSuggestions,
  CANONICAL_BY_SYNONYM,
};
