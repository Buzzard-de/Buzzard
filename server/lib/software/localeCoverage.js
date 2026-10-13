/**
 * Locale/file coverage. Does not invent missing translations.
 */

const { getI18nReadiness } = require("../storefront/storefrontI18nReadiness");

function measure() {
  const readiness = getI18nReadiness();
  const missing = readiness.requiredLocales.filter((locale) => !readiness.configuredLocales.includes(locale));
  return {
    ...readiness,
    missingLocales: missing,
    fallback: "de",
    languageIndependentFromMarket: true,
    inventedTranslations: false,
    rtlPreserved: readiness.rtlSupport === true,
  };
}

module.exports = { measure };
