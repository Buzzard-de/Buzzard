/**
 * Local catalog publish gate. A plan is not a live marketplace listing.
 */
const { getCountry } = require("../buzzardNative/core/tax/countryRegistry");

const plans = new Map();
const REQUIRED_LOCALES = Object.freeze(["de", "en"]);

function closed(code, status, extra = {}) {
  return {
    ok: false,
    published: false,
    sellable: false,
    live: false,
    liveMarketplace: false,
    productionReady: false,
    salesEnabled: false,
    commercial: false,
    price: null,
    stock: null,
    code,
    status,
    attempts: 1,
    duplicate: false,
    ...extra,
  };
}

function missingTranslations(input) {
  const required = Array.isArray(input.requiredLocales) && input.requiredLocales.length
    ? input.requiredLocales
    : REQUIRED_LOCALES;
  const translations = input.translations && typeof input.translations === "object" ? input.translations : {};
  return required
    .map((locale) => String(locale || "").toLowerCase())
    .filter((locale) => locale && !String(translations[locale] || "").trim());
}

function planCatalogPublish(input = {}) {
  const sku = input.sku ? String(input.sku) : "";
  const marketplace = input.marketplace ? String(input.marketplace) : "";
  const country = getCountry(input.country);
  const countryCode = country ? country.countryCode : null;
  const key = input.idempotencyKey || `${marketplace}:${sku}:${countryCode || input.country || ""}`;
  if (plans.has(key) && input.action !== "retry") {
    const prior = plans.get(key);
    return closed("DUPLICATE_PUBLISH", prior.status, {
      ...prior,
      code: "DUPLICATE_PUBLISH",
      duplicate: true,
      published: false,
      sellable: false,
      live: false,
      productionReady: false,
    });
  }

  const missing = missingTranslations(input);
  const reasons = [];
  if (input.mock === true || input.demo === true || input.synthetic === true || input.source === "mock") {
    reasons.push("MOCK_NOT_A_PUBLISH");
  }
  if (!sku || input.productVerified !== true) reasons.push("PRODUCT_UNVERIFIED");
  if (!input.category) reasons.push("CATEGORY_UNVERIFIED");
  if (missing.length) reasons.push("TRANSLATION_MISSING");
  if (!country) reasons.push("COUNTRY_OUT_OF_SCOPE");
  if (input.priceVerified !== true || typeof input.price !== "number" || !Number.isFinite(input.price)) {
    reasons.push("PRICE_UNVERIFIED");
  }
  if (input.stockVerified !== true || input.syntheticStock === true) reasons.push("STOCK_UNVERIFIED");
  if (!input.image || input.imageVerified !== true) reasons.push("IMAGE_UNVERIFIED");
  if (!marketplace) reasons.push("MARKETPLACE_UNKNOWN");
  reasons.push("MARKETPLACE_NOT_AUTHORIZED");
  if (input.timeout === true || input.forceTimeout === true) reasons.unshift("TIMEOUT");
  if (input.networkError === true) reasons.unshift("NETWORK_ERROR");
  reasons.push("SALES_CLOSED");

  const code = reasons[0];
  const status = code === "TIMEOUT" || code === "NETWORK_ERROR" ? "FAILED" : "BLOCKED";
  const result = closed(code, status, {
    reasons,
    missingTranslations: missing,
    translationsComplete: missing.length === 0,
    countryScope: country ? "IN_SCOPE" : "OUT_OF_SCOPE",
    country: countryCode,
    sku: sku || null,
    marketplace: marketplace || null,
    vatVerified: false,
  });
  plans.set(key, result);
  return result;
}

function retryCatalogPublish(key) {
  const prior = key ? plans.get(key) : null;
  if (!prior) return closed("RETRY_UNKNOWN", "UNKNOWN", { attempts: 0, published: false });
  const next = closed(prior.status === "FAILED" ? prior.code : "RETRY_NOT_PUBLISHED", prior.status === "FAILED" ? "FAILED" : prior.status, {
    ...prior,
    attempts: (prior.attempts || 1) + 1,
    code: prior.status === "FAILED" ? prior.code : "RETRY_NOT_PUBLISHED",
    published: false,
    sellable: false,
    live: false,
    liveMarketplace: false,
    productionReady: false,
    duplicate: false,
  });
  plans.set(key, next);
  return next;
}

module.exports = {
  planCatalogPublish,
  retryCatalogPublish,
  REQUIRED_LOCALES,
};
