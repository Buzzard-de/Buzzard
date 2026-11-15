/**
 * Local supplier snapshot gate.
 * A snapshot is not a live supplier feed, an order, or a reservation.
 */
const { getCountry } = require("../buzzardNative/core/tax/countryRegistry");
const { isSalesEnabled } = require("../salesMode");

const snapshots = new Map();
const STALE_MS = 24 * 60 * 60 * 1000;

function countryCode(value) {
  const row = getCountry(value);
  return row ? row.countryCode : null;
}

function closed(code, status, extra = {}) {
  return {
    ok: false,
    code,
    status,
    live: false,
    current: false,
    commercial: false,
    productionReady: false,
    price: null,
    priceStatus: "UNKNOWN",
    priceVerified: false,
    qty: "UNKNOWN",
    stockStatus: "UNKNOWN",
    stockVerified: false,
    currency: null,
    currencyStatus: "UNKNOWN",
    selectedSource: null,
    orderCreated: false,
    purchased: false,
    reserved: false,
    callerFlagIgnored: true,
    duplicate: false,
    attempts: 1,
    ...extra,
  };
}

function planSupplierSnapshot(input = {}) {
  const supplierId = input.supplierId ? String(input.supplierId) : "";
  const sku = input.sku ? String(input.sku) : "";
  const productSku = input.productSku == null ? sku : String(input.productSku);
  const country = countryCode(input.country);
  const priceCountry = countryCode(input.priceCountry);
  const stockCountry = countryCode(input.stockCountry);
  const key = input.idempotencyKey || `${supplierId}:${sku}:${country || ""}:${input.observedAt || ""}`;
  if (snapshots.has(key) && input.action !== "retry") {
    const prior = snapshots.get(key);
    return closed("DUPLICATE_SNAPSHOT", prior.status, {
      ...prior,
      code: "DUPLICATE_SNAPSHOT",
      duplicate: true,
      price: null,
      qty: "UNKNOWN",
      orderCreated: false,
      purchased: false,
      reserved: false,
    });
  }

  const reasons = [];
  if (!isSalesEnabled()) reasons.push("SALES_CLOSED");
  if (input.mock === true || input.demo === true || input.synthetic === true || input.source === "mock" || input.source === "DEMO") {
    reasons.push("MOCK_NOT_SUPPLIER");
  }
  if (!supplierId || !sku || !input.productId || sku !== productSku) reasons.push("SUPPLIER_SNAPSHOT_MISMATCH");
  const currency = String(input.currency || "").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) reasons.push("CURRENCY_UNKNOWN");
  const priceConflict = typeof input.price === "number" && typeof input.conflictingPrice === "number" && input.price !== input.conflictingPrice;
  const stockConflict = typeof input.qty === "number" && typeof input.conflictingQty === "number" && input.qty !== input.conflictingQty;
  if (priceConflict || stockConflict) reasons.push("SNAPSHOT_CONFLICT");
  const observed = Date.parse(String(input.observedAt || ""));
  if (!Number.isFinite(observed) || Date.now() - observed > STALE_MS) reasons.push("STALE_SNAPSHOT");
  if (!country) reasons.push("COUNTRY_UNKNOWN");
  if (priceCountry && country && priceCountry !== country) reasons.push("PRICE_COUNTRY_MISMATCH");
  if (stockCountry && country && stockCountry !== country) reasons.push("STOCK_COUNTRY_MISMATCH");
  reasons.push("PRICE_UNVERIFIED");
  reasons.push("STOCK_UNVERIFIED");
  if (input.timeout === true || input.forceTimeout === true) reasons.unshift("TIMEOUT");
  if (input.networkError === true) reasons.unshift("NETWORK_ERROR");

  const code = reasons.find((reason) => reason !== "SALES_CLOSED") || "SUPPLIER_SNAPSHOT_UNVERIFIED";
  const status = code === "TIMEOUT" || code === "NETWORK_ERROR" ? "FAILED" : code === "STALE_SNAPSHOT" || code === "PRICE_UNVERIFIED" ? "UNKNOWN" : "BLOCKED";
  const result = closed(code === "PRICE_UNVERIFIED" ? "SUPPLIER_SNAPSHOT_UNVERIFIED" : code, status, {
    reasons,
    supplierId: supplierId || null,
    sku: sku && sku === productSku ? sku : null,
    productId: input.productId || null,
    country,
    priceCountry,
    stockCountry,
    countryMatch: Boolean(country && (!priceCountry || priceCountry === country) && (!stockCountry || stockCountry === country)),
  });
  snapshots.set(key, result);
  return result;
}

function retrySupplierSnapshot(key) {
  const prior = key ? snapshots.get(key) : null;
  if (!prior) return closed("RETRY_UNKNOWN", "UNKNOWN", { attempts: 0 });
  const next = closed(prior.status === "FAILED" ? prior.code : "RETRY_NOT_APPLIED", prior.status === "FAILED" ? "FAILED" : prior.status, {
    ...prior,
    attempts: (prior.attempts || 1) + 1,
    code: prior.status === "FAILED" ? prior.code : "RETRY_NOT_APPLIED",
    price: null,
    qty: "UNKNOWN",
    selectedSource: null,
    orderCreated: false,
    purchased: false,
    reserved: false,
    duplicate: false,
  });
  snapshots.set(key, next);
  return next;
}

module.exports = {
  planSupplierSnapshot,
  retrySupplierSnapshot,
};
