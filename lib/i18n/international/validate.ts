import { getAllLocalePairs, getCountryConfig, listCountryConfigs, REQUIRED_MARKET_COUNT } from "./config";
import { TRANSLATION_NAMESPACES } from "./types";

export interface BuzzardI18nValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    countries: number;
    locales: number;
    languages: Set<string>;
  };
}

const REQUIRED_COUNTRIES = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT",
  "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  "TR", "SA", "AE", "QA", "KW", "BH", "OM", "EG",
];

export function validateBuzzardI18n(): BuzzardI18nValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const countries = listCountryConfigs();
  const localeSet = new Set<string>();
  const languages = new Set<string>();

  if (countries.length !== REQUIRED_MARKET_COUNT) {
    errors.push(`Expected ${REQUIRED_MARKET_COUNT} markets, found ${countries.length}.`);
  }

  for (const code of REQUIRED_COUNTRIES) {
    if (!getCountryConfig(code)) {
      errors.push(`Missing required market: ${code}.`);
    }
  }

  for (const country of countries) {
    if (!country.supportedLanguages?.length) {
      errors.push(`${country.countryCode}: no supportedLanguages.`);
    }

    if (!country.defaultLanguage) {
      errors.push(`${country.countryCode}: missing defaultLanguage.`);
    } else if (!country.supportedLanguages.includes(country.defaultLanguage)) {
      errors.push(`${country.countryCode}: defaultLanguage not in supportedLanguages.`);
    }

    if (!country.locale) {
      errors.push(`${country.countryCode}: missing default locale.`);
    }

    if (!country.currency) {
      errors.push(`${country.countryCode}: missing currency.`);
    }

    if (!country.timezone) {
      errors.push(`${country.countryCode}: missing timezone.`);
    }

    for (const lang of country.supportedLanguages) {
      languages.add(lang);
    }

    const variants = (country as { localeVariants?: Array<{ locale: string }> }).localeVariants ?? [];
    for (const v of variants) {
      if (localeSet.has(v.locale)) {
        errors.push(`Duplicate locale: ${v.locale}.`);
      }
      localeSet.add(v.locale);
    }

    if (!localeSet.has(country.locale) && !variants.some((v) => v.locale === country.locale)) {
      localeSet.add(country.locale);
    }
  }

  if (TRANSLATION_NAMESPACES.length < 20) {
    warnings.push("Translation namespace list may be incomplete.");
  }

  const isDev = process.env.NODE_ENV === "development";
  if (isDev && errors.length) {
    for (const err of errors) {
      console.warn(`[BUZZARD i18n] Invalid market configuration: ${err}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      countries: countries.length,
      locales: getAllLocalePairs().length,
      languages,
    },
  };
}
