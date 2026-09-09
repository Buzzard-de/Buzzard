/**
 * Central language registry — data-driven, extends existing de/en/tr/ar UI locales.
 */
const { getCountry, listCountries } = require("./globalCountryRegistry");

const UI_LOCALES = Object.freeze([
  "de", "en", "tr", "ar", "fr", "it", "es", "nl", "pl", "cs", "sk", "hu", "ro", "bg", "hr", "sl",
  "da", "sv", "fi", "et", "lv", "lt", "pt", "el", "ca", "eu", "gl", "ga", "lb", "mt",
]);

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
  ar: { languageCode: "ar", locale: "ar-SA", direction: "rtl", fallbackLanguage: "ar", nativeName: "العربية", seoLocale: "ar-SA",   uiReady: true, readinessStatus: READINESS.READY },
  fr: { languageCode: "fr", locale: "fr-FR", direction: "ltr", fallbackLanguage: "fr", nativeName: "Français", seoLocale: "fr-FR", uiReady: true, readinessStatus: READINESS.READY },
  it: { languageCode: "it", locale: "it-IT", direction: "ltr", fallbackLanguage: "it", nativeName: "Italiano", seoLocale: "it-IT", uiReady: true, readinessStatus: READINESS.READY },
  es: { languageCode: "es", locale: "es-ES", direction: "ltr", fallbackLanguage: "es", nativeName: "Español", seoLocale: "es-ES", uiReady: true, readinessStatus: READINESS.READY },
  nl: { languageCode: "nl", locale: "nl-NL", direction: "ltr", fallbackLanguage: "nl", nativeName: "Nederlands", seoLocale: "nl-NL", uiReady: true, readinessStatus: READINESS.READY },
  pl: { languageCode: "pl", locale: "pl-PL", direction: "ltr", fallbackLanguage: "pl", nativeName: "Polski", seoLocale: "pl-PL", uiReady: true, readinessStatus: READINESS.READY },
  cs: { languageCode: "cs", locale: "cs-CZ", direction: "ltr", fallbackLanguage: "cs", nativeName: "Čeština", seoLocale: "cs-CZ", uiReady: true, readinessStatus: READINESS.READY },
  sk: { languageCode: "sk", locale: "sk-SK", direction: "ltr", fallbackLanguage: "sk", nativeName: "Slovenčina", seoLocale: "sk-SK", uiReady: true, readinessStatus: READINESS.READY },
  hu: { languageCode: "hu", locale: "hu-HU", direction: "ltr", fallbackLanguage: "hu", nativeName: "Magyar", seoLocale: "hu-HU", uiReady: true, readinessStatus: READINESS.READY },
  ro: { languageCode: "ro", locale: "ro-RO", direction: "ltr", fallbackLanguage: "ro", nativeName: "Română", seoLocale: "ro-RO", uiReady: true, readinessStatus: READINESS.READY },
  bg: { languageCode: "bg", locale: "bg-BG", direction: "ltr", fallbackLanguage: "bg", nativeName: "Български", seoLocale: "bg-BG", uiReady: true, readinessStatus: READINESS.READY },
  hr: { languageCode: "hr", locale: "hr-HR", direction: "ltr", fallbackLanguage: "hr", nativeName: "Hrvatski", seoLocale: "hr-HR", uiReady: true, readinessStatus: READINESS.READY },
  sl: { languageCode: "sl", locale: "sl-SI", direction: "ltr", fallbackLanguage: "sl", nativeName: "Slovenščina", seoLocale: "sl-SI", uiReady: true, readinessStatus: READINESS.READY },
  da: { languageCode: "da", locale: "da-DK", direction: "ltr", fallbackLanguage: "da", nativeName: "Dansk", seoLocale: "da-DK", uiReady: true, readinessStatus: READINESS.READY },
  sv: { languageCode: "sv", locale: "sv-SE", direction: "ltr", fallbackLanguage: "sv", nativeName: "Svenska", seoLocale: "sv-SE", uiReady: true, readinessStatus: READINESS.READY },
  no: { languageCode: "no", locale: "nb-NO", direction: "ltr", fallbackLanguage: "no", nativeName: "Norsk", seoLocale: "nb-NO", uiReady: false, readinessStatus: READINESS.PREPARED },
  fi: { languageCode: "fi", locale: "fi-FI", direction: "ltr", fallbackLanguage: "fi", nativeName: "Suomi", seoLocale: "fi-FI", uiReady: true, readinessStatus: READINESS.READY },
  et: { languageCode: "et", locale: "et-EE", direction: "ltr", fallbackLanguage: "et", nativeName: "Eesti", seoLocale: "et-EE", uiReady: true, readinessStatus: READINESS.READY },
  lv: { languageCode: "lv", locale: "lv-LV", direction: "ltr", fallbackLanguage: "lv", nativeName: "Latviešu", seoLocale: "lv-LV", uiReady: true, readinessStatus: READINESS.READY },
  lt: { languageCode: "lt", locale: "lt-LT", direction: "ltr", fallbackLanguage: "lt", nativeName: "Lietuvių", seoLocale: "lt-LT", uiReady: true, readinessStatus: READINESS.READY },
  pt: { languageCode: "pt", locale: "pt-PT", direction: "ltr", fallbackLanguage: "pt", nativeName: "Português", seoLocale: "pt-PT", uiReady: true, readinessStatus: READINESS.READY },
  el: { languageCode: "el", locale: "el-GR", direction: "ltr", fallbackLanguage: "el", nativeName: "Ελληνικά", seoLocale: "el-GR", uiReady: true, readinessStatus: READINESS.READY },
  ca: { languageCode: "ca", locale: "ca-ES", direction: "ltr", fallbackLanguage: "ca", nativeName: "Català", seoLocale: "ca-ES", uiReady: true, readinessStatus: READINESS.READY },
  eu: { languageCode: "eu", locale: "eu-ES", direction: "ltr", fallbackLanguage: "eu", nativeName: "Euskara", seoLocale: "eu-ES", uiReady: true, readinessStatus: READINESS.READY },
  gl: { languageCode: "gl", locale: "gl-ES", direction: "ltr", fallbackLanguage: "gl", nativeName: "Galego", seoLocale: "gl-ES", uiReady: true, readinessStatus: READINESS.READY },
  ga: { languageCode: "ga", locale: "ga-IE", direction: "ltr", fallbackLanguage: "ga", nativeName: "Gaeilge", seoLocale: "ga-IE", uiReady: true, readinessStatus: READINESS.READY },
  lb: { languageCode: "lb", locale: "lb-LU", direction: "ltr", fallbackLanguage: "lb", nativeName: "Lëtzebuergesch", seoLocale: "lb-LU", uiReady: true, readinessStatus: READINESS.READY },
  mt: { languageCode: "mt", locale: "mt-MT", direction: "ltr", fallbackLanguage: "mt", nativeName: "Malti", seoLocale: "mt-MT", uiReady: true, readinessStatus: READINESS.READY },
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
