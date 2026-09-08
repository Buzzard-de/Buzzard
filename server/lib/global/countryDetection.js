/**
 * Deterministic country detection — fail-closed, no sales activation.
 */
const { getCountry, getDefaultCountryCode, isSupportedCountry } = require("../../core/globalCountryRegistry");

function detectCountryFromRequest(req) {
  const headerCountry = req?.headers?.["x-buzzard-country"] || req?.headers?.["cf-ipcountry"];
  if (headerCountry && isSupportedCountry(headerCountry)) {
    return { countryCode: String(headerCountry).toUpperCase(), source: "request_header" };
  }
  return null;
}

function detectCountryFromProfile(profile) {
  const code = profile?.country || profile?.marketCountry || profile?.preferences?.country;
  if (code && isSupportedCountry(code)) {
    return { countryCode: String(code).toUpperCase(), source: "user_profile" };
  }
  return null;
}

function detectCountryFromSavedPreference(savedCountryCode) {
  if (savedCountryCode && isSupportedCountry(savedCountryCode)) {
    return { countryCode: String(savedCountryCode).toUpperCase(), source: "saved_preference" };
  }
  return null;
}

function detectCountryFromBrowserLocale(browserLocale) {
  if (!browserLocale) return null;
  const region = String(browserLocale).split("-")[1]?.toUpperCase();
  if (region && isSupportedCountry(region)) {
    return { countryCode: region, source: "browser_locale" };
  }
  return null;
}

function resolveCountry(options = {}) {
  const chain = [
    detectCountryFromProfile(options.profile),
    detectCountryFromSavedPreference(options.savedCountryCode),
    detectCountryFromRequest(options.req),
    detectCountryFromBrowserLocale(options.browserLocale),
  ].filter(Boolean);

  if (chain.length) return chain[0];

  return {
    countryCode: getDefaultCountryCode(),
    source: "default",
  };
}

function getResolvedCountryConfig(options = {}) {
  const resolved = resolveCountry(options);
  const country = getCountry(resolved.countryCode);
  return { ...resolved, country };
}

module.exports = {
  detectCountryFromRequest,
  detectCountryFromProfile,
  detectCountryFromSavedPreference,
  detectCountryFromBrowserLocale,
  resolveCountry,
  getResolvedCountryConfig,
};
