/**
 * Category localization — stable IDs, localized labels.
 */
const { resolveCanonicalTerm } = require("./synonymEngine");

function getLocalizedCategoryLabel(category = {}, language = "de") {
  if (!category) return null;
  const labels = category.localizedNames || category.labels || category.name || {};
  if (typeof labels === "string") return labels;
  return labels[language] || labels.de || labels.en || category.id || null;
}

function resolveCategoryFromQuery(query, taxonomyNodes = []) {
  const canonical = resolveCanonicalTerm(query);
  if (canonical) {
    const node = taxonomyNodes.find((n) => n.canonical === canonical || n.id === canonical);
    if (node) {
      return { ok: true, categoryId: node.categoryId || node.id, confidence: "HIGH", node };
    }
  }

  const normalized = String(query || "").trim().toLowerCase();
  for (const node of taxonomyNodes) {
    const labels = node.localizedNames || node.labels || {};
    for (const label of Object.values(labels)) {
      if (String(label).toLowerCase() === normalized) {
        return { ok: true, categoryId: node.id, confidence: "HIGH", node };
      }
    }
  }

  return { ok: false, categoryId: null, confidence: "UNKNOWN", status: "REVIEW_REQUIRED" };
}

module.exports = {
  getLocalizedCategoryLabel,
  resolveCategoryFromQuery,
};
