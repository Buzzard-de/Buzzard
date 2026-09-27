/**
 * Per-country readiness report.
 */
const { getCountry } = require("../../core/globalCountryRegistry");
const { GLOBAL_SAFETY_POLICY } = require("../../core/globalSafetyPolicy");

function buildCountryReadinessReport(countryCode, stats = {}) {
  const country = getCountry(countryCode);
  if (!country) {
    return {
      country: countryCode,
      catalogReady: false,
      status: "BLOCKED",
      blockers: [{ code: "COUNTRY_NOT_SUPPORTED" }],
    };
  }

  const blockers = [];
  if (!stats.translationReady) blockers.push({ code: "MISSING_TRANSLATIONS" });
  if (!stats.searchReady) blockers.push({ code: "SEARCH_NOT_READY" });
  if (GLOBAL_SAFETY_POLICY.publishBlocked) blockers.push({ code: "PUBLISH_BLOCKED_BY_POLICY" });

  return {
    country: country.countryCode,
    language: country.defaultLanguage,
    currency: country.currency,
    catalogReady: blockers.length === 0 && stats.productCount > 0,
    languageReady: Boolean(stats.languageReady ?? true),
    searchReady: Boolean(stats.searchReady ?? country.searchEnabled),
    translationReady: Boolean(stats.translationReady ?? false),
    productCount: stats.productCount || 0,
    approvedCount: stats.approvedCount || 0,
    publishableCount: 0,
    reviewRequired: stats.reviewRequired || 0,
    blockers,
    safety: GLOBAL_SAFETY_POLICY,
  };
}

module.exports = {
  buildCountryReadinessReport,
};
