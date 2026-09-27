/**
 * Country catalog matrix — admin diagnostic view.
 */
const { listCountries } = require("../../core/globalCountryRegistry");
const { GLOBAL_SAFETY_POLICY } = require("../../core/globalSafetyPolicy");
const { buildCountryReadinessReport } = require("./countryReadinessReport");

function buildCountryCatalogMatrix(statsByCountry = {}) {
  return listCountries().map((country) => {
    const stats = statsByCountry[country.countryCode] || {};
    const readiness = buildCountryReadinessReport(country.countryCode, stats);
    return {
      country: country.countryCode,
      countryName: country.countryName,
      language: country.defaultLanguage,
      currency: country.currency,
      catalogStatus: readiness.catalogReady ? "READY" : "BLOCKED",
      productCount: stats.productCount || 0,
      translationStatus: readiness.translationReady ? "READY" : "MISSING",
      seoStatus: stats.seoReady ? "READY" : "MISSING",
      imageStatus: stats.imageReady ? "READY" : "MISSING",
      fitmentStatus: stats.fitmentReady ? "READY" : "UNKNOWN",
      reviewCount: stats.reviewRequired || 0,
      publishableCount: 0,
      safety: GLOBAL_SAFETY_POLICY,
    };
  });
}

module.exports = {
  buildCountryCatalogMatrix,
};
