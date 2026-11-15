/**
 * Local stock authority gate.
 * A supplier report is not saleable stock, a reservation, or a purchase.
 */
const { getCountry } = require("../buzzardNative/core/tax/countryRegistry");
const { isSalesEnabled } = require("../salesMode");

const decisions = new Map();
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
    sourceReliability: "UNVERIFIED",
    quantity: null,
    quantityStatus: status === "BLOCKED" ? "BLOCKED" : "UNKNOWN",
    saleable: false,
    purchasable: false,
    available: false,
    reserved: false,
    purchased: false,
    reservationCreated: false,
    orderCreated: false,
    live: false,
    commercial: false,
    productionReady: false,
    callerFlagIgnored: true,
    duplicate: false,
    attempts: 1,
    selectedSource: null,
    ...extra,
  };
}

function decideStockAuthority(input = {}) {
  const supplierId = input.supplierId ? String(input.supplierId) : "";
  const source = input.source ? String(input.source) : "";
  const sku = input.sku ? String(input.sku) : "";
  const productSku = input.productSku == null ? sku : String(input.productSku);
  const country = countryCode(input.country);
  const stockCountry = countryCode(input.stockCountry);
  const key = input.idempotencyKey || `${supplierId}:${source}:${sku}:${country || ""}`;
  if (decisions.has(key) && input.action !== "retry") {
    const prior = decisions.get(key);
    return closed("DUPLICATE_STOCK_DECISION", prior.status, {
      ...prior,
      code: "DUPLICATE_STOCK_DECISION",
      duplicate: true,
      quantity: null,
      saleable: false,
      reserved: false,
      purchased: false,
    });
  }

  const reasons = [];
  if (!isSalesEnabled()) reasons.push("SALES_CLOSED");
  if (
    input.mock === true ||
    input.demo === true ||
    input.synthetic === true ||
    input.source === "mock" ||
    input.source === "DEMO" ||
    source === "mock"
  ) {
    reasons.push("MOCK_NOT_AUTHORITY");
  }
  if (!supplierId || !sku || !input.productId || sku !== productSku) reasons.push("STOCK_RELATION_MISMATCH");
  if (!source || source === "mock") reasons.push("STOCK_SOURCE_UNVERIFIED");
  const qty = input.quantity;
  const other = input.conflictingQuantity;
  if (typeof qty === "number" && typeof other === "number" && qty !== other) reasons.push("STOCK_CONFLICT");
  const observed = Date.parse(String(input.observedAt || ""));
  if (!Number.isFinite(observed) || Date.now() - observed > STALE_MS) reasons.push("STALE_STOCK");
  if (!country || !stockCountry) reasons.push("COUNTRY_STOCK_UNKNOWN");
  else if (country !== stockCountry) reasons.push("COUNTRY_STOCK_MISMATCH");
  reasons.push("STOCK_AUTHORITY_UNVERIFIED");
  if (input.timeout === true || input.forceTimeout === true) reasons.unshift("TIMEOUT");
  if (input.networkError === true) reasons.unshift("NETWORK_ERROR");

  const found = reasons.find((reason) => reason !== "SALES_CLOSED") || "STOCK_AUTHORITY_UNVERIFIED";
  const code = found === "STOCK_AUTHORITY_UNVERIFIED" ? "STOCK_AUTHORITY_UNVERIFIED" : found;
  const status = code === "TIMEOUT" || code === "NETWORK_ERROR" ? "FAILED" : code === "STALE_STOCK" || code === "STOCK_AUTHORITY_UNVERIFIED" || code === "COUNTRY_STOCK_UNKNOWN" ? "UNKNOWN" : "BLOCKED";
  const result = closed(code, status, {
    reasons,
    supplierId: supplierId || null,
    source: source && source !== "mock" ? source : null,
    sku: sku && sku === productSku ? sku : null,
    productId: input.productId || null,
    country,
    stockCountry,
    countryMatch: Boolean(country && stockCountry && country === stockCountry),
  });
  decisions.set(key, result);
  return result;
}

function retryStockAuthority(key) {
  const prior = key ? decisions.get(key) : null;
  if (!prior) return closed("RETRY_UNKNOWN", "UNKNOWN", { attempts: 0 });
  const next = closed(prior.status === "FAILED" ? prior.code : "RETRY_NOT_APPLIED", prior.status === "FAILED" ? "FAILED" : prior.status, {
    ...prior,
    attempts: (prior.attempts || 1) + 1,
    code: prior.status === "FAILED" ? prior.code : "RETRY_NOT_APPLIED",
    quantity: null,
    saleable: false,
    reserved: false,
    purchased: false,
    selectedSource: null,
    duplicate: false,
  });
  decisions.set(key, next);
  return next;
}

module.exports = {
  decideStockAuthority,
  retryStockAuthority,
};
