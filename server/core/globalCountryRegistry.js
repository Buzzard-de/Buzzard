/**
 * Central 35-country registry — single source of truth for market configuration.
 */
const countriesData = require("../../data/global/global_countries_35.json");
const marketOverlay = require("../../data/global/market_country_overlay.json");
const languageRegistry = require("./globalLanguageRegistry");
const { GLOBAL_SAFETY_POLICY } = require("./globalSafetyPolicy");

const COUNTRY_BY_CODE = new Map(countriesData.map((c) => [c.countryCode, Object.freeze(c)]));

function listCountries() {
  return [...COUNTRY_BY_CODE.values()];
}

function getCountry(countryCode) {
  if (!countryCode) return null;
  return COUNTRY_BY_CODE.get(String(countryCode).toUpperCase()) || null;
}

function isSupportedCountry(countryCode) {
  return COUNTRY_BY_CODE.has(String(countryCode || "").toUpperCase());
}

function getDefaultCountryCode() {
  return "DE";
}

function getCountriesByLanguage(languageCode) {
  const lang = String(languageCode || "").toLowerCase();
  return listCountries().filter(
    (c) => c.defaultLanguage === lang || c.supportedLanguages.includes(lang)
  );
}

function getCountryCount() {
  return COUNTRY_BY_CODE.size;
}

function getCountryMarketProfile(countryCode) {
  const country = getCountry(countryCode);
  if (!country) return null;
  const overlay = marketOverlay[country.countryCode] || {};
  const defaultLang = languageRegistry.getLanguage(country.defaultLanguage);
  return {
    countryCode: country.countryCode,
    countryName: country.countryName,
    defaultLanguage: country.defaultLanguage,
    supportedLanguages: country.supportedLanguages,
    currency: country.currency,
    locale: country.locale,
    rtl: overlay.rtl === true || defaultLang?.direction === "rtl",
    marketEnabled: country.catalogEnabled && !GLOBAL_SAFETY_POLICY.publishBlocked,
    shippingEnabled: false,
    taxRegion: country.taxConfigurationKey || country.shippingRegion,
    availability: country.catalogEnabled ? "PREPARED" : "BLOCKED",
    searchEnabled: country.searchEnabled,
    seoLocale: country.seoLocale,
    safety: GLOBAL_SAFETY_POLICY,
  };
}

function listCountryMarketProfiles() {
  return listCountries().map((c) => getCountryMarketProfile(c.countryCode));
}

function getCatalogContext(countryCode) {
  const country = getCountry(countryCode) || getCountry(getDefaultCountryCode());
  return {
    country: country.countryCode,
    countryName: country.countryName,
    defaultLanguage: country.defaultLanguage,
    supportedLanguages: country.supportedLanguages,
    currency: country.currency,
    locale: country.locale,
    seoLocale: country.seoLocale,
    catalogEnabled: country.catalogEnabled && !GLOBAL_SAFETY_POLICY.publishBlocked,
    searchEnabled: country.searchEnabled,
    safety: GLOBAL_SAFETY_POLICY,
  };
}

module.exports = {
  listCountries,
  getCountry,
  isSupportedCountry,
  getDefaultCountryCode,
  getCountriesByLanguage,
  getCountryCount,
  getCountryMarketProfile,
  listCountryMarketProfiles,
  getCatalogContext,
};
