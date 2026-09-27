/**
 * hreflang generation — scalable, no circular references.
 */
const { getCountry, listCountries } = require("../../core/globalCountryRegistry");
const { getLanguage } = require("../../core/globalLanguageRegistry");

function buildHreflangTag(countryCode, languageCode) {
  const country = getCountry(countryCode);
  const language = getLanguage(languageCode);
  if (!country || !language) return null;
  if (!country.supportedLanguages.includes(language.languageCode)) return null;
  return `${language.languageCode}-${country.countryCode}`;
}

function buildHreflangAlternates(path, availablePairs = []) {
  const alternates = [];
  const seen = new Set();

  for (const pair of availablePairs) {
    const tag = buildHreflangTag(pair.country, pair.language);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    alternates.push({
      hreflang: tag,
      href: pair.href || `${path}?country=${pair.country}&lang=${pair.language}`,
    });
  }

  const defaultPair = availablePairs.find((p) => p.country === "DE" && p.language === "de") || availablePairs[0];
  if (defaultPair) {
    alternates.push({
      hreflang: "x-default",
      href: defaultPair.href || path,
    });
  }

  return alternates;
}

function buildCountryLanguageHreflangMatrix(pathBase = "") {
  const pairs = [];
  for (const country of listCountries()) {
    for (const lang of country.supportedLanguages) {
      pairs.push({
        country: country.countryCode,
        language: lang,
        href: `${pathBase}?country=${country.countryCode}&lang=${lang}`,
      });
    }
  }
  return buildHreflangAlternates(pathBase || "/", pairs);
}

module.exports = {
  buildHreflangTag,
  buildHreflangAlternates,
  buildCountryLanguageHreflangMatrix,
};
