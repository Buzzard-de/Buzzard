/**
 * Locale/file coverage. Does not invent missing translations.
 */

const { getI18nReadiness } = require("../storefront/storefrontI18nReadiness");

function measure() {
  const readiness = getI18nReadiness();
  const missing = readiness.requiredLocales.filter((locale) => !readiness.configuredLocales.includes(locale));
  return {
    ...readiness,
    missingLocales: missing,
    fallback: "de",
    languageIndependentFromMarket: true,
    inventedTranslations: false,
    rtlPreserved: readiness.rtlSupport === true,
    rtlStylesheet: readiness.rtlStylesheet === true,
    liveVerified: false,
  };
}

function resolveMessage(input = {}) {
  const locale = String(input.locale || "de").trim() || "de";
  const catalog = input.catalog && typeof input.catalog === "object" ? input.catalog : {};
  const key = String(input.key || "").trim();
  if (!key) {
    return { ok: false, invented: false, reason: "MESSAGE_KEY_REQUIRED", locale };
  }
  if (Object.prototype.hasOwnProperty.call(catalog, locale) && catalog[locale] != null) {
    return {
      ok: true,
      locale,
      key,
      value: String(catalog[locale]),
      fallbackUsed: false,
      invented: false,
      languageIndependentFromMarket: true,
    };
  }
  if (Object.prototype.hasOwnProperty.call(catalog, "de") && catalog.de != null) {
    return {
      ok: true,
      locale,
      key,
      value: String(catalog.de),
      fallbackUsed: true,
      fallbackLocale: "de",
      invented: false,
      languageIndependentFromMarket: true,
    };
  }
  return {
    ok: false,
    locale,
    key,
    value: null,
    fallbackUsed: false,
    invented: false,
    reason: "TRANSLATION_MISSING",
    languageIndependentFromMarket: true,
  };
}

function bindLocaleToMarket(input = {}) {
  const locale = String(input.locale || "").trim();
  const market = String(input.market || input.country || "").trim().toUpperCase();
  if (!locale || !market) {
    return {
      ok: false,
      rewritten: false,
      invented: false,
      languageIndependentFromMarket: true,
      reason: "LOCALE_AND_MARKET_REQUIRED",
    };
  }
  return {
    ok: true,
    locale,
    market,
    rewritten: false,
    invented: false,
    languageIndependentFromMarket: true,
    rtlForced: false,
    note: "Selecting a market does not rewrite the active language.",
  };
}

function legalCopyForMarket(input = {}) {
  return {
    ok: false,
    invented: false,
    liveLegal: false,
    copy: null,
    market: String(input.market || input.country || "").trim().toUpperCase() || null,
    reason: "LEGAL_COPY_NOT_INVENTED",
    note: "Per-market legal pages are not generated from this module.",
  };
}

module.exports = { measure, resolveMessage, bindLocaleToMarket, legalCopyForMarket };
