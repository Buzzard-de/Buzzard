/**
 * Buzzard i18n health check — validates 35-market configuration.
 */
const { getCountryCount, listCountries, getCountry } = require("../../core/globalCountryRegistry");
const { getLanguage } = require("../../core/globalLanguageRegistry");
const currencyRegistry = require("../../core/globalCurrencyRegistry");

const REQUIRED_COUNTRIES = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT",
  "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  "TR", "SA", "AE", "QA", "KW", "BH", "OM", "EG",
];

function validateBuzzardI18n() {
  const errors = [];
  const warnings = [];
  const locales = new Set();
  const languages = new Set();

  if (getCountryCount() !== 35) {
    errors.push(`Expected 35 markets, found ${getCountryCount()}.`);
  }

  for (const code of REQUIRED_COUNTRIES) {
    if (!getCountry(code)) errors.push(`Missing market: ${code}.`);
  }

  for (const country of listCountries()) {
    if (!country.supportedLanguages?.length) {
      errors.push(`${country.countryCode}: no supportedLanguages.`);
    }
    if (!country.defaultLanguage) {
      errors.push(`${country.countryCode}: missing defaultLanguage.`);
    } else if (!country.supportedLanguages.includes(country.defaultLanguage)) {
      errors.push(`${country.countryCode}: invalid defaultLanguage.`);
    }
    if (!country.locale) errors.push(`${country.countryCode}: missing locale.`);
    if (!country.currency) errors.push(`${country.countryCode}: missing currency.`);
    if (!currencyRegistry.getCurrency(country.currency)) {
      errors.push(`${country.countryCode}: unknown currency ${country.currency}.`);
    }
    if (!country.timezone) errors.push(`${country.countryCode}: missing timezone.`);

    for (const lang of country.supportedLanguages) {
      languages.add(lang);
      if (!getLanguage(lang)) warnings.push(`${country.countryCode}: language ${lang} not in registry.`);
    }

    const variants = country.localeVariants || [];
    for (const v of variants) {
      if (locales.has(v.locale)) errors.push(`Duplicate locale: ${v.locale}.`);
      locales.add(v.locale);
    }
    locales.add(country.locale);
  }

  const isDev = process.env.NODE_ENV === "development";
  if (isDev) {
    for (const err of errors) console.warn(`[BUZZARD i18n] ${err}`);
    for (const warn of warnings) console.warn(`[BUZZARD i18n] ${warn}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: { countries: getCountryCount(), locales: locales.size, languages: [...languages] },
  };
}

module.exports = { validateBuzzardI18n };
