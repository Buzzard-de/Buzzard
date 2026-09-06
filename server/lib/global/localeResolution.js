/**
 * Deterministic language resolution — manual override always wins.
 */
const { getLanguage, isUiLocale, resolveLanguageWithFallback } = require("../../core/globalLanguageRegistry");
const { getCountry } = require("../../core/globalCountryRegistry");

function resolveLanguage(options = {}) {
  const {
    explicitLanguage,
    savedLanguage,
    manualOverride = false,
    savedManualOverride = false,
    countryCode,
    browserLanguages = [],
    defaultLanguage = "de",
  } = options;

  if (manualOverride || savedManualOverride) {
    const lang = explicitLanguage || savedLanguage;
    if (lang && getLanguage(lang)) {
      return { language: lang, source: "manual_override" };
    }
  }

  if (explicitLanguage && getLanguage(explicitLanguage)) {
    return { language: explicitLanguage, source: "explicit_selection" };
  }

  if (savedLanguage && getLanguage(savedLanguage)) {
    return { language: savedLanguage, source: "saved_preference" };
  }

  const country = getCountry(countryCode);
  if (country?.defaultLanguage && getLanguage(country.defaultLanguage)) {
    return { language: country.defaultLanguage, source: "country_default" };
  }

  if (countryCode && country?.fallbackLanguage) {
    return { language: country.fallbackLanguage, source: "country_fallback" };
  }

  if (getLanguage(defaultLanguage)) {
    return { language: defaultLanguage, source: "global_default" };
  }

  for (const tag of browserLanguages) {
    const code = String(tag).slice(0, 2).toLowerCase();
    if (getLanguage(code)) {
      return { language: code, source: "browser_accept_language" };
    }
  }

  return { language: defaultLanguage, source: "global_default" };
}

function buildLocaleContext(options = {}) {
  const countryResolved = options.countryCode || "DE";
  const country = getCountry(countryResolved);
  const languageResolved = resolveLanguage({
    ...options,
    countryCode: country?.countryCode || countryResolved,
  });
  const language = resolveLanguageWithFallback(languageResolved.language, country?.countryCode);
  const currency = country?.currency || "EUR";

  return {
    country: country?.countryCode || "DE",
    countryName: country?.countryName || "Germany",
    language: language.languageCode,
    languageNativeName: language.nativeName,
    locale: country?.locale || language.locale,
    seoLocale: country?.seoLocale || language.seoLocale,
    currency,
    direction: language.direction,
    measurementSystem: country?.measurementSystem || "metric",
    dateFormat: country?.dateFormat || "DD.MM.YYYY",
    numberFormat: country?.numberFormat || language.locale,
    fallbackLanguage: language.fallbackLanguage,
    uiReady: isUiLocale(language.languageCode),
    resolution: {
      countrySource: options.countrySource || "default",
      languageSource: languageResolved.source,
    },
  };
}

module.exports = {
  resolveLanguage,
  buildLocaleContext,
};
