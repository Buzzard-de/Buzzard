/**
 * Central 35-country registry — single source of truth for market configuration.
 */
const countriesData = require("../../data/global/global_countries_35.json");
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
  getCatalogContext,
};
