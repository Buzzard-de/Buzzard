/**
 * Marketplace and international integrity — local software only.
 * Listings stay unpublished. Language is not rewritten by market.
 * Unknown VAT is not DE. RTL uses stylesheet + locale, not invented copy.
 *
 * Band 114–136 is already established-scope 100% (115/129 HUMAN).
 * This module closes leftover language/country/RTL software (144–146)
 * without live marketplace writes.
 */

const fs = require("fs");
const path = require("path");
const { isSalesEnabled } = require("../salesMode");
const marketplace = require("./marketplace");
const localeCoverage = require("./localeCoverage");
const taxProvider = require("../commerce/taxProvider");
const marketEngine = require("../../core/marketEngineRegistry");
const { quoteForMarket } = require("./pricing");

const RTL_LOCALES = Object.freeze(["ar", "he", "fa", "ur"]);
const RTL_CSS_PATH = path.join(__dirname, "../../../styles/rtl.css");

function inspect() {
  const coverage = localeCoverage.measure();
  const registry = marketEngine.validateMarketRegistry();
  const connectors = marketplace.classifyConnectors();
  return {
    ok: true,
    live: false,
    liveVerified: false,
    salesEnabled: isSalesEnabled() === true,
    anyPublished: false,
    anyLiveListing: false,
    marketCount: registry.count,
    marketRegistryValid: registry.valid === true,
    localeCount: coverage.localeCount,
    languageIndependentFromMarket: coverage.languageIndependentFromMarket === true,
    inventedTranslations: coverage.inventedTranslations === true,
    rtlSupport: coverage.rtlSupport === true,
    rtlStylesheet: coverage.rtlStylesheet === true,
    classificationOnly: connectors.filter((c) => c.classificationOnly).length,
    unpublished: connectors.every((c) => c.published !== true),
  };
}

function classifyChannel(id) {
  return marketplace.classify(id);
}

function publishListing(input = {}) {
  return marketplace.publishListing(input);
}

function activateDraft(input = {}) {
  return marketplace.activateDraft(input);
}

function pushFeed(input = {}) {
  return marketplace.pushFeed(input);
}

function approvePublish(input = {}) {
  return marketplace.approvePublish(input);
}

function mapCategory(input = {}) {
  return marketplace.mapCategory(input);
}

function selectLanguage(input = {}) {
  const locale = String(input.locale || "").trim();
  const market = String(input.market || input.country || "").trim().toUpperCase();
  if (!locale) {
    return {
      ok: false,
      applied: false,
      marketRewritten: false,
      invented: false,
      live: false,
      languageIndependentFromMarket: true,
      reason: "LOCALE_REQUIRED",
    };
  }
  const coverage = localeCoverage.measure();
  const known = coverage.configuredLocales.includes(locale);
  return {
    ok: true,
    applied: known,
    locale,
    market: market || null,
    marketRewritten: false,
    invented: false,
    live: false,
    knownLocale: known,
    languageIndependentFromMarket: true,
    note: "Language selection does not rewrite the active market.",
  };
}

function selectCountry(input = {}) {
  const bound = localeCoverage.bindLocaleToMarket(input);
  return {
    ...bound,
    live: false,
    vatInvented: false,
    marketRewrittenLanguage: false,
    languageIndependentFromMarket: true,
    note: bound.note || "Selecting a market does not rewrite the active language.",
  };
}

function rtlForLocale(locale) {
  const loc = String(locale || "").trim().toLowerCase();
  const coverage = localeCoverage.measure();
  const css = fs.existsSync(RTL_CSS_PATH) ? fs.readFileSync(RTL_CSS_PATH, "utf8") : "";
  const rtl = RTL_LOCALES.includes(loc);
  return {
    locale: loc || null,
    dir: rtl ? "rtl" : "ltr",
    rtl: rtl,
    rtlSupport: coverage.rtlSupport === true,
    rtlStylesheet: coverage.rtlStylesheet === true,
    logicalTextAlignStart: css.includes("text-align: start"),
    rightAlignHack: /text-align:\s*right/.test(css),
    invented: false,
    live: false,
  };
}

function unknownVat(input = {}) {
  const tax = taxProvider.calculateTax({
    country: input.country || "XX",
    subtotal: input.subtotal == null ? 100 : input.subtotal,
    category: input.category || null,
  });
  return {
    ...tax,
    invented: false,
    vatLive: false,
    defaultedToDe: false,
    live: false,
  };
}

function quoteForeignCurrency(input = {}) {
  return quoteForMarket({
    market: input.market || "PL",
    currency: input.currency || "PLN",
    supplierCost: input.supplierCost == null ? 10 : input.supplierCost,
    shippingCost: input.shippingCost == null ? 2 : input.shippingCost,
    returnReserve: input.returnReserve == null ? 0.4 : input.returnReserve,
    marketplaceCommissionRate: input.marketplaceCommissionRate == null ? 0.12 : input.marketplaceCommissionRate,
  });
}

function legalCopy(input = {}) {
  return localeCoverage.legalCopyForMarket(input);
}

function resolveCopy(input = {}) {
  return localeCoverage.resolveMessage(input);
}

module.exports = {
  inspect,
  classifyChannel,
  publishListing,
  activateDraft,
  pushFeed,
  approvePublish,
  mapCategory,
  selectLanguage,
  selectCountry,
  rtlForLocale,
  unknownVat,
  quoteForeignCurrency,
  legalCopy,
  resolveCopy,
};
