/**
 * Local supplier offer checks. A synthetic row is never stock, a price, or a purchase.
 */

function currencyOf(value) {
  const code = String(value || "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : "UNKNOWN";
}

function leadTimeOf(value) {
  if (value == null || value === "" || !Number.isFinite(Number(value)) || Number(value) < 0) return "UNKNOWN";
  return Number(value);
}

function countryScopeOf(countries, destination) {
  if (!Array.isArray(countries) || countries.length === 0 || !destination) return "UNKNOWN";
  const dest = String(destination).trim().toUpperCase();
  const scope = countries.map((code) => String(code).trim().toUpperCase());
  return scope.includes(dest) ? "IN_SCOPE" : "OUT_OF_SCOPE";
}

function numberOrNull(value) {
  if (value == null || value === "" || !Number.isFinite(Number(value))) return null;
  return Number(value);
}

function validateSupplierOffer(feed = {}, destination) {
  const sku = String(feed.sku || feed.supplier_sku || "").trim();
  return {
    supplier: feed.supplier || feed.supplierId || "UNKNOWN",
    sku: sku || "UNKNOWN",
    product: sku ? "PRESENT" : "UNKNOWN",
    price: null,
    stock: null,
    fixturePrice: numberOrNull(feed.price ?? feed.amount ?? feed.supplier_price?.amount),
    fixtureStock: numberOrNull(feed.stock ?? feed.qty),
    currency: feed.currency || feed.supplier_price?.currency ? currencyOf(feed.currency || feed.supplier_price?.currency) : "UNKNOWN",
    leadTimeDays: leadTimeOf(feed.leadTimeDays),
    leadTimeVerified: false,
    countryScope: countryScopeOf(feed.countries, destination),
    verified: false,
    mock: feed.mock === true || feed.source === "synthetic" || feed.source === "manual",
    commercialUse: false,
    purchased: false,
    reserved: false,
  };
}

function selectSupplier({ feeds = [], customerOrderVerified = false, destination } = {}) {
  const candidates = (Array.isArray(feeds) ? feeds : []).map((feed) => validateSupplierOffer(feed, destination));
  return {
    ok: false,
    live: false,
    chosen: null,
    purchased: false,
    reserved: false,
    sellable: false,
    code: customerOrderVerified === true ? "LIVE_CONNECTION_ABSENT" : "ORDER_UNVERIFIED",
    status: "BLOCKED_EXTERNAL",
    commercialEligibility: "BLOCKED",
    candidates,
  };
}

module.exports = {
  validateSupplierOffer,
  selectSupplier,
  currencyOf,
  leadTimeOf,
  countryScopeOf,
};
