/**
 * Server-side International Market Engine — mirrors lib/market-engine for API validation.
 * Client country/market selection must be re-validated here for VAT, price, shipping, legal.
 */
const countriesData = require("../../data/global/global_countries_35.json");
const marketOverlay = require("../../data/global/market_country_overlay.json");
const engineExtensions = require("../../data/global/market_engine_extensions.json");
const { isProductAvailableInCountry } = require("../lib/global/countryAvailability");

const EU_COUNTRY_CODES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
]);

const DEFAULT_COUNTRY = "DE";
const marketByCode = new Map();

function buildMarket(country) {
  const overlay = marketOverlay[country.countryCode] || {};
  const paymentRegion = engineExtensions.paymentRegions[country.countryCode] || "EU";
  const featureDefaults = engineExtensions.defaultFeatureFlags;
  const featureOverrides = engineExtensions.featureFlags[country.countryCode] || {};
  let status = engineExtensions.marketStatus[country.countryCode] || engineExtensions.defaultMarketStatus;
  if (country.enabled === false) status = "DISABLED";

  return Object.freeze({
    countryCode: country.countryCode,
    countryName: country.countryName,
    defaultLanguage: country.defaultLanguage,
    supportedLanguages: country.supportedLanguages,
    currency: country.currency,
    currencySymbol: country.currencySymbol,
    locale: country.locale,
    timezone: country.timezone,
    textDirection: country.textDirection || "ltr",
    vat: {
      standardRate: overlay.taxRate ?? 0.2,
      pricesIncludeVat: true,
      taxModel: overlay.taxModel || "VAT",
    },
    shippingRegion: engineExtensions.shippingRegions[country.countryCode] || "EU_CENTRAL",
    paymentRegion,
    legalRegion: engineExtensions.legalRegions[country.countryCode] || `EU_${country.countryCode}`,
    returnRegion: engineExtensions.returnRegions[country.countryCode] || paymentRegion,
    supplierRegion: engineExtensions.supplierRegions[country.countryCode] || paymentRegion,
    status,
    featureFlags: { ...featureDefaults, ...featureOverrides },
    marketplaces: engineExtensions.marketplaces[country.countryCode] || [],
    paymentCapabilities: engineExtensions.paymentCapabilities[paymentRegion] || ["card"],
    shippingCapabilities: engineExtensions.shippingCapabilities,
  });
}

function ensureBuilt() {
  if (marketByCode.size) return;
  for (const country of countriesData) {
    marketByCode.set(country.countryCode, buildMarket(country));
  }
}

function getMarket(countryCode) {
  ensureBuilt();
  return marketByCode.get(String(countryCode || "").toUpperCase()) || null;
}

function getDefaultMarket() {
  return getMarket(DEFAULT_COUNTRY) || [...marketByCode.values()][0];
}

function listMarkets() {
  ensureBuilt();
  return [...marketByCode.values()];
}

function getMarketRegistryCount() {
  ensureBuilt();
  return marketByCode.size;
}

function validateMarketRegistry() {
  ensureBuilt();
  const errors = [];
  if (marketByCode.size !== 35) errors.push(`Expected 35 markets, found ${marketByCode.size}`);
  return { valid: errors.length === 0, count: marketByCode.size, errors };
}

function isEuCountry(countryCode) {
  return EU_COUNTRY_CODES.has(String(countryCode || "").toUpperCase());
}

function isValidVatId(vatId) {
  if (!vatId) return false;
  return vatId.trim().length >= 4 && /^[A-Z]{2}[A-Z0-9]+$/i.test(vatId.trim());
}

function getVatContext({ sellerCountry, buyerCountry, customerType, vatId }) {
  const seller = String(sellerCountry || "").toUpperCase();
  const buyer = String(buyerCountry || "").toUpperCase();
  const sellerMarket = getMarket(seller) || getDefaultMarket();
  const buyerMarket = getMarket(buyer) || getDefaultMarket();
  const domestic = seller === buyer;
  const sellerEu = isEuCountry(seller);
  const buyerEu = isEuCountry(buyer);
  const intraEu = sellerEu && buyerEu && !domestic;

  if (customerType === "B2B") {
    if (intraEu && isValidVatId(vatId)) {
      return { rate: 0, included: false, reverseCharge: true, reason: "B2B_INTRA_EU_REVERSE_CHARGE" };
    }
    if (sellerEu && !buyerEu) {
      return { rate: 0, included: false, reverseCharge: false, reason: "B2B_EXPORT_ZERO_RATED" };
    }
    if (domestic) {
      return { rate: sellerMarket.vat.standardRate, included: false, reverseCharge: false, reason: "B2B_DOMESTIC_NET" };
    }
    return { rate: buyerMarket.vat.standardRate, included: buyerMarket.vat.pricesIncludeVat, reverseCharge: false, reason: "B2B_CROSS_BORDER_DEFAULT" };
  }

  if (domestic) {
    return { rate: sellerMarket.vat.standardRate, included: sellerMarket.vat.pricesIncludeVat, reverseCharge: false, reason: "B2C_DOMESTIC" };
  }
  if (intraEu) {
    return { rate: buyerMarket.vat.standardRate, included: buyerMarket.vat.pricesIncludeVat, reverseCharge: false, reason: "B2C_INTRA_EU_DESTINATION" };
  }
  return { rate: buyerMarket.vat.standardRate, included: buyerMarket.vat.pricesIncludeVat, reverseCharge: false, reason: "B2C_CROSS_BORDER" };
}

function getEligibleSupplierRegions(countryCode) {
  const market = getMarket(countryCode);
  if (!market) return ["EU"];
  const primary = market.supplierRegion;
  const fallbacks = engineExtensions.supplierFallbacks[primary] || engineExtensions.supplierFallbacks.NON_EU || ["EU"];
  return [...new Set([primary, ...fallbacks.filter((r) => r !== primary)])];
}

function validateMarketRequest(countryCode) {
  const market = getMarket(countryCode);
  if (!market) return { valid: false, reason: "UNKNOWN_MARKET" };
  if (market.status === "DISABLED" || market.status === "PAUSED") {
    return { valid: false, reason: "MARKET_UNAVAILABLE", market };
  }
  return { valid: true, market };
}

function isProductAvailableInMarket(product, countryCode) {
  const validation = validateMarketRequest(countryCode);
  if (!validation.valid) {
    return { available: false, status: "MARKET_DISABLED", reason: validation.reason };
  }
  return isProductAvailableInCountry(product, countryCode);
}

module.exports = {
  EU_COUNTRY_CODES,
  getMarket,
  getDefaultMarket,
  listMarkets,
  getMarketRegistryCount,
  validateMarketRegistry,
  isEuCountry,
  getVatContext,
  getEligibleSupplierRegions,
  validateMarketRequest,
  isProductAvailableInMarket,
  getMarketShippingRegion: (code) => getMarket(code)?.shippingRegion || "EU_CENTRAL",
  getMarketPaymentCapabilities: (code) => getMarket(code)?.paymentCapabilities || ["card"],
  getMarketplaces: (code) => getMarket(code)?.marketplaces || [],
};
