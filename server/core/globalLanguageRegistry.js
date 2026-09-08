/**
 * Central language registry — data-driven, extends existing de/en/tr/ar UI locales.
 */
const { getCountry, listCountries } = require("./globalCountryRegistry");

const UI_LOCALES = Object.freeze(["de", "en", "tr", "ar"]);

const READINESS = Object.freeze({
  READY: "READY",
  PREPARED: "PREPARED",
  DISABLED: "DISABLED",
});

function resolveReadinessStatus(lang) {
  if (lang.uiReady) return READINESS.READY;
  if (lang.languageCode) return READINESS.PREPARED;
  return READINESS.DISABLED;
}

const LANGUAGE_DEFINITIONS = Object.freeze({
  de: { languageCode: "de", locale: "de-DE", direction: "ltr", fallbackLanguage: "de", nativeName: "Deutsch", seoLocale: "de-DE", uiReady: true, readinessStatus: READINESS.READY },
  en: { languageCode: "en", locale: "en-GB", direction: "ltr", fallbackLanguage: "en", nativeName: "English", seoLocale: "en-GB", uiReady: true, readinessStatus: READINESS.READY },
  tr: { languageCode: "tr", locale: "tr-TR", direction: "ltr", fallbackLanguage: "tr", nativeName: "Türkçe", seoLocale: "tr-TR", uiReady: true, readinessStatus: READINESS.READY },
  ar: { languageCode: "ar", locale: "ar-SA", direction: "rtl", fallbackLanguage: "ar", nativeName: "العربية", seoLocale: "ar-SA", uiReady: true, readinessStatus: READINESS.READY },
  fr: { languageCode: "fr", locale: "fr-FR", direction: "ltr", fallbackLanguage: "fr", nativeName: "Français", seoLocale: "fr-FR", uiReady: false, readinessStatus: READINESS.PREPARED },
  it: { languageCode: "it", locale: "it-IT", direction: "ltr", fallbackLanguage: "it", nativeName: "Italiano", seoLocale: "it-IT", uiReady: false, readinessStatus: READINESS.PREPARED },
  es: { languageCode: "es", locale: "es-ES", direction: "ltr", fallbackLanguage: "es", nativeName: "Español", seoLocale: "es-ES", uiReady: false, readinessStatus: READINESS.PREPARED },
  nl: { languageCode: "nl", locale: "nl-NL", direction: "ltr", fallbackLanguage: "nl", nativeName: "Nederlands", seoLocale: "nl-NL", uiReady: false, readinessStatus: READINESS.PREPARED },
  pl: { languageCode: "pl", locale: "pl-PL", direction: "ltr", fallbackLanguage: "pl", nativeName: "Polski", seoLocale: "pl-PL", uiReady: false, readinessStatus: READINESS.PREPARED },
  cs: { languageCode: "cs", locale: "cs-CZ", direction: "ltr", fallbackLanguage: "cs", nativeName: "Čeština", seoLocale: "cs-CZ", uiReady: false, readinessStatus: READINESS.PREPARED },
  sk: { languageCode: "sk", locale: "sk-SK", direction: "ltr", fallbackLanguage: "sk", nativeName: "Slovenčina", seoLocale: "sk-SK", uiReady: false, readinessStatus: READINESS.PREPARED },
  hu: { languageCode: "hu", locale: "hu-HU", direction: "ltr", fallbackLanguage: "hu", nativeName: "Magyar", seoLocale: "hu-HU", uiReady: false, readinessStatus: READINESS.PREPARED },
  ro: { languageCode: "ro", locale: "ro-RO", direction: "ltr", fallbackLanguage: "ro", nativeName: "Română", seoLocale: "ro-RO", uiReady: false, readinessStatus: READINESS.PREPARED },
  bg: { languageCode: "bg", locale: "bg-BG", direction: "ltr", fallbackLanguage: "bg", nativeName: "Български", seoLocale: "bg-BG", uiReady: false, readinessStatus: READINESS.PREPARED },
  hr: { languageCode: "hr", locale: "hr-HR", direction: "ltr", fallbackLanguage: "hr", nativeName: "Hrvatski", seoLocale: "hr-HR", uiReady: false, readinessStatus: READINESS.PREPARED },
  sl: { languageCode: "sl", locale: "sl-SI", direction: "ltr", fallbackLanguage: "sl", nativeName: "Slovenščina", seoLocale: "sl-SI", uiReady: false, readinessStatus: READINESS.PREPARED },
  da: { languageCode: "da", locale: "da-DK", direction: "ltr", fallbackLanguage: "da", nativeName: "Dansk", seoLocale: "da-DK", uiReady: false, readinessStatus: READINESS.PREPARED },
  sv: { languageCode: "sv", locale: "sv-SE", direction: "ltr", fallbackLanguage: "sv", nativeName: "Svenska", seoLocale: "sv-SV", uiReady: false, readinessStatus: READINESS.PREPARED },
  no: { languageCode: "no", locale: "nb-NO", direction: "ltr", fallbackLanguage: "no", nativeName: "Norsk", seoLocale: "nb-NO", uiReady: false, readinessStatus: READINESS.PREPARED },
  fi: { languageCode: "fi", locale: "fi-FI", direction: "ltr", fallbackLanguage: "fi", nativeName: "Suomi", seoLocale: "fi-FI", uiReady: false, readinessStatus: READINESS.PREPARED },
  et: { languageCode: "et", locale: "et-EE", direction: "ltr", fallbackLanguage: "et", nativeName: "Eesti", seoLocale: "et-EE", uiReady: false, readinessStatus: READINESS.PREPARED },
  lv: { languageCode: "lv", locale: "lv-LV", direction: "ltr", fallbackLanguage: "lv", nativeName: "Latviešu", seoLocale: "lv-LV", uiReady: false, readinessStatus: READINESS.PREPARED },
  lt: { languageCode: "lt", locale: "lt-LT", direction: "ltr", fallbackLanguage: "lt", nativeName: "Lietuvių", seoLocale: "lt-LT", uiReady: false, readinessStatus: READINESS.PREPARED },
  pt: { languageCode: "pt", locale: "pt-PT", direction: "ltr", fallbackLanguage: "pt", nativeName: "Português", seoLocale: "pt-PT", uiReady: false, readinessStatus: READINESS.PREPARED },
  el: { languageCode: "el", locale: "el-GR", direction: "ltr", fallbackLanguage: "el", nativeName: "Ελληνικά", seoLocale: "el-GR", uiReady: false, readinessStatus: READINESS.PREPARED },
  ca: { languageCode: "ca", locale: "ca-ES", direction: "ltr", fallbackLanguage: "ca", nativeName: "Català", seoLocale: "ca-ES", uiReady: false, readinessStatus: READINESS.PREPARED },
  eu: { languageCode: "eu", locale: "eu-ES", direction: "ltr", fallbackLanguage: "eu", nativeName: "Euskara", seoLocale: "eu-ES", uiReady: false, readinessStatus: READINESS.PREPARED },
  gl: { languageCode: "gl", locale: "gl-ES", direction: "ltr", fallbackLanguage: "gl", nativeName: "Galego", seoLocale: "gl-ES", uiReady: false, readinessStatus: READINESS.PREPARED },
  ga: { languageCode: "ga", locale: "ga-IE", direction: "ltr", fallbackLanguage: "ga", nativeName: "Gaeilge", seoLocale: "ga-IE", uiReady: false, readinessStatus: READINESS.PREPARED },
  lb: { languageCode: "lb", locale: "lb-LU", direction: "ltr", fallbackLanguage: "lb", nativeName: "Lëtzebuergesch", seoLocale: "lb-LU", uiReady: false, readinessStatus: READINESS.PREPARED },
  mt: { languageCode: "mt", locale: "mt-MT", direction: "ltr", fallbackLanguage: "mt", nativeName: "Malti", seoLocale: "mt-MT", uiReady: false, readinessStatus: READINESS.PREPARED },
});

function listLanguages() {
  return Object.values(LANGUAGE_DEFINITIONS);
}

function getReadinessStatus(languageCode) {
  const lang = getLanguage(languageCode);
  if (!lang) return READINESS.DISABLED;
  return lang.readinessStatus || resolveReadinessStatus(lang);
}

function getLanguage(languageCode) {
  if (!languageCode) return null;
  return LANGUAGE_DEFINITIONS[String(languageCode).toLowerCase()] || null;
}

function isUiLocale(languageCode) {
  return UI_LOCALES.includes(String(languageCode || "").toLowerCase());
}

function getLanguagesForCountry(countryCode) {
  const country = getCountry(countryCode);
  if (!country) return [];
  return country.supportedLanguages
    .map((code) => getLanguage(code))
    .filter(Boolean);
}

function getCountriesForLanguage(languageCode) {
  return listCountries()
    .filter((c) => c.supportedLanguages.includes(String(languageCode).toLowerCase()))
    .map((c) => c.countryCode);
}

function resolveLanguageWithFallback(languageCode, countryCode) {
  const lang = getLanguage(languageCode);
  if (lang) return lang;
  const country = getCountry(countryCode);
  if (country) return getLanguage(country.fallbackLanguage) || getLanguage("de");
  return getLanguage("de");
}

module.exports = {
  UI_LOCALES,
  READINESS,
  listLanguages,
  getLanguage,
  isUiLocale,
  getReadinessStatus,
  getLanguagesForCountry,
  getCountriesForLanguage,
  resolveLanguageWithFallback,
};
