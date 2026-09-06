/**
 * Global catalog health report — admin diagnostic only.
 */
const { getCountryCount, listCountries } = require("../../core/globalCountryRegistry");
const { listLanguages, UI_LOCALES } = require("../../core/globalLanguageRegistry");
const { listCurrencies } = require("../../core/globalCurrencyRegistry");
const { GLOBAL_SAFETY_POLICY, assertGlobalSafetyPolicy } = require("../../core/globalSafetyPolicy");
const { buildCountryCatalogMatrix } = require("./countryCatalogMatrix");

function buildGlobalCatalogHealth(options = {}) {
  const stats = options.stats || {};
  const safetyCheck = assertGlobalSafetyPolicy();
  const matrix = buildCountryCatalogMatrix(stats.byCountry || {});

  const blockers = [];
  if (!safetyCheck.compliant) blockers.push({ code: "SAFETY_POLICY_NON_COMPLIANT" });
  if (GLOBAL_SAFETY_POLICY.publishBlocked) blockers.push({ code: "PUBLISH_BLOCKED" });
  blockers.push(...(stats.blockers || []));

  return {
    ready: false,
    status: "BLOCKED",
    diagnosticOnly: true,
    countries: {
      configured: getCountryCount(),
      expected: 35,
      list: listCountries().map((c) => c.countryCode),
    },
    languages: {
      configured: listLanguages().length,
      uiReady: UI_LOCALES,
      prepared: listLanguages().filter((l) => !l.uiReady).map((l) => l.languageCode),
    },
    currencies: {
      configured: listCurrencies().length,
      codes: listCurrencies().map((c) => c.code),
    },
    products: {
      total: stats.productCount || 0,
      approved: stats.approvedCount || 0,
      published: 0,
      reviewRequired: stats.reviewRequired || 0,
      missingTranslations: stats.missingTranslations || 0,
      missingImages: stats.missingImages || 0,
      invalidIdentifiers: stats.invalidIdentifiers || 0,
      countryMappingFailures: stats.countryMappingFailures || 0,
      categoryMappingFailures: stats.categoryMappingFailures || 0,
      fitmentFailures: stats.fitmentFailures || 0,
    },
    countryMatrix: matrix,
    blockers,
    safety: GLOBAL_SAFETY_POLICY,
    safetyCheck,
    integration: {
      pimCatalogFoundation: options.hasPimFoundation ?? false,
      automotiveCategorySystem: options.hasAutomotive ?? false,
      reconciliationPr300: options.hasReconciliation ?? false,
    },
  };
}

module.exports = {
  buildGlobalCatalogHealth,
};
