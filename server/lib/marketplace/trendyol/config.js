const { HOSTS, STOREFRONTS } = require("./contract");

function readConfig(env = process.env) {
  const environment = env.TRENDYOL_ENV === "production" ? "production" : "stage";
  const sellerId = String(env.TRENDYOL_SELLER_ID || "").trim();
  const apiKey = String(env.TRENDYOL_API_KEY || "").trim();
  const apiSecret = String(env.TRENDYOL_API_SECRET || "").trim();
  const storeFrontCode = String(env.TRENDYOL_STORE_FRONT_CODE || "DE").trim().toUpperCase();
  const integrator = String(env.TRENDYOL_INTEGRATOR_NAME || "SelfIntegration").replace(/[^A-Za-z0-9]/g, "").slice(0, 30) || "SelfIntegration";
  const sellerOk = /^[1-9]\d{0,19}$/.test(sellerId);
  const storefront = STOREFRONTS[storeFrontCode] || null;
  const baseUrl = String(env.TRENDYOL_BASE_URL || HOSTS[environment]).replace(/\/$/, "");
  const issues = [];
  if (!sellerId) issues.push("SELLER_ID_MISSING");
  else if (!sellerOk) issues.push("SELLER_ID_INVALID");
  if (!apiKey) issues.push("API_KEY_MISSING");
  if (!apiSecret) issues.push("API_SECRET_MISSING");
  if (storeFrontCode === "TR") issues.push("DOMESTIC_MARKET_REJECTED");
  else if (!storefront) issues.push("STOREFRONT_UNKNOWN");

  const configured = sellerOk && apiKey.length > 0 && apiSecret.length > 0 && Boolean(storefront);
  return {
    environment,
    market: "international",
    region: storefront ? storefront.region : null,
    storeFrontCode,
    sellerId: sellerOk ? sellerId : null,
    baseUrl,
    userAgent: sellerOk ? `${sellerId} - ${integrator}` : null,
    enabled: env.TRENDYOL_ENABLED === "1",
    configured,
    issues,
    live: false,
    network: false,
    productionReady: false,
    apiKey: configured ? apiKey : null,
    apiSecret: configured ? apiSecret : null,
  };
}

function publicView(config) {
  return {
    environment: config.environment,
    market: config.market,
    region: config.region,
    storeFrontCode: config.storeFrontCode,
    sellerId: config.sellerId,
    baseUrl: config.baseUrl,
    userAgent: config.userAgent,
    enabled: config.enabled,
    configured: config.configured,
    issues: config.issues,
    apiKey: config.apiKey ? "set" : "missing",
    apiSecret: config.apiSecret ? "set" : "missing",
    live: false,
    network: false,
    productionReady: false,
  };
}

module.exports = { readConfig, publicView };
