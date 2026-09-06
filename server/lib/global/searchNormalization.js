/**
 * Search query normalization — preserve meaningful identifiers (MPN, oil grades).
 */
function stripDiacritics(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeSearchQuery(query, options = {}) {
  let normalized = String(query || "")
    .trim()
    .replace(/\s+/g, " ");

  if (!options.preserveCase) normalized = normalized.toLowerCase();
  if (options.stripDiacritics !== false) normalized = stripDiacritics(normalized);

  normalized = normalized
    .replace(/[""''„«»]/g, "")
    .replace(/\s*([/\\])\s*/g, "$1");

  const oilGradePattern = /\b(\d{1,2}w\s*-?\s*\d{2})\b/gi;
  normalized = normalized.replace(oilGradePattern, (_, grade) => grade.replace(/\s+/g, "").toUpperCase());

  return normalized.trim();
}

function tokenizeQuery(query) {
  return normalizeSearchQuery(query).split(/\s+/).filter(Boolean);
}

function normalizeIdentifierToken(token) {
  return String(token || "").trim().toUpperCase();
}

module.exports = {
  stripDiacritics,
  normalizeSearchQuery,
  tokenizeQuery,
  normalizeIdentifierToken,
};
