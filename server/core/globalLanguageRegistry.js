/**
 * Central language registry — data-driven, extends existing de/en/tr/ar UI locales.
 */
const { getCountry, listCountries } = require("./globalCountryRegistry");

const UI_LOCALES = Object.freeze(["de", "en", "tr", "ar"]);

const LANGUAGE_DEFINITIONS = Object.freeze({
  de: { languageCode: "de", locale: "de-DE", direction: "ltr", fallbackLanguage: "de", nativeName: "Deutsch", seoLocale: "de-DE", uiReady: true },
  en: { languageCode: "en", locale: "en-GB", direction: "ltr", fallbackLanguage: "en", nativeName: "English", seoLocale: "en-GB", uiReady: true },
  tr: { languageCode: "tr", locale: "tr-TR", direction: "ltr", fallbackLanguage: "tr", nativeName: "Türkçe", seoLocale: "tr-TR", uiReady: true },
  ar: { languageCode: "ar", locale: "ar-SA", direction: "rtl", fallbackLanguage: "ar", nativeName: "العربية", seoLocale: "ar-SA", uiReady: true },
  fr: { languageCode: "fr", locale: "fr-FR", direction: "ltr", fallbackLanguage: "fr", nativeName: "Français", seoLocale: "fr-FR", uiReady: false },
  it: { languageCode: "it", locale: "it-IT", direction: "ltr", fallbackLanguage: "it", nativeName: "Italiano", seoLocale: "it-IT", uiReady: false },
  es: { languageCode: "es", locale: "es-ES", direction: "ltr", fallbackLanguage: "es", nativeName: "Español", seoLocale: "es-ES", uiReady: false },
  nl: { languageCode: "nl", locale: "nl-NL", direction: "ltr", fallbackLanguage: "nl", nativeName: "Nederlands", seoLocale: "nl-NL", uiReady: false },
  pl: { languageCode: "pl", locale: "pl-PL", direction: "ltr", fallbackLanguage: "pl", nativeName: "Polski", seoLocale: "pl-PL", uiReady: false },
  cs: { languageCode: "cs", locale: "cs-CZ", direction: "ltr", fallbackLanguage: "cs", nativeName: "Čeština", seoLocale: "cs-CZ", uiReady: false },
  sk: { languageCode: "sk", locale: "sk-SK", direction: "ltr", fallbackLanguage: "sk", nativeName: "Slovenčina", seoLocale: "sk-SK", uiReady: false },
  hu: { languageCode: "hu", locale: "hu-HU", direction: "ltr", fallbackLanguage: "hu", nativeName: "Magyar", seoLocale: "hu-HU", uiReady: false },
  ro: { languageCode: "ro", locale: "ro-RO", direction: "ltr", fallbackLanguage: "ro", nativeName: "Română", seoLocale: "ro-RO", uiReady: false },
  bg: { languageCode: "bg", locale: "bg-BG", direction: "ltr", fallbackLanguage: "bg", nativeName: "Български", seoLocale: "bg-BG", uiReady: false },
  hr: { languageCode: "hr", locale: "hr-HR", direction: "ltr", fallbackLanguage: "hr", nativeName: "Hrvatski", seoLocale: "hr-HR", uiReady: false },
  sl: { languageCode: "sl", locale: "sl-SI", direction: "ltr", fallbackLanguage: "sl", nativeName: "Slovenščina", seoLocale: "sl-SI", uiReady: false },
  da: { languageCode: "da", locale: "da-DK", direction: "ltr", fallbackLanguage: "da", nativeName: "Dansk", seoLocale: "da-DK", uiReady: false },
  sv: { languageCode: "sv", locale: "sv-SE", direction: "ltr", fallbackLanguage: "sv", nativeName: "Svenska", seoLocale: "sv-SV", uiReady: false },
  no: { languageCode: "no", locale: "nb-NO", direction: "ltr", fallbackLanguage: "no", nativeName: "Norsk", seoLocale: "nb-NO", uiReady: false },
  fi: { languageCode: "fi", locale: "fi-FI", direction: "ltr", fallbackLanguage: "fi", nativeName: "Suomi", seoLocale: "fi-FI", uiReady: false },
  et: { languageCode: "et", locale: "et-EE", direction: "ltr", fallbackLanguage: "et", nativeName: "Eesti", seoLocale: "et-EE", uiReady: false },
  lv: { languageCode: "lv", locale: "lv-LV", direction: "ltr", fallbackLanguage: "lv", nativeName: "Latviešu", seoLocale: "lv-LV", uiReady: false },
  lt: { languageCode: "lt", locale: "lt-LT", direction: "ltr", fallbackLanguage: "lt", nativeName: "Lietuvių", seoLocale: "lt-LT", uiReady: false },
  pt: { languageCode: "pt", locale: "pt-PT", direction: "ltr", fallbackLanguage: "pt", nativeName: "Português", seoLocale: "pt-PT", uiReady: false },
  el: { languageCode: "el", locale: "el-GR", direction: "ltr", fallbackLanguage: "el", nativeName: "Ελληνικά", seoLocale: "el-GR", uiReady: false },
});

function listLanguages() {
  return Object.values(LANGUAGE_DEFINITIONS);
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
  listLanguages,
  getLanguage,
  isUiLocale,
  getLanguagesForCountry,
  getCountriesForLanguage,
  resolveLanguageWithFallback,
};
