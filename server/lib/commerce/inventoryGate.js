/**
 * Dropshipping stock gate. Buzzard holds no warehouse quantity.
 * A supplier report is not available stock until a live feed confirms it.
 */
const { getCountry } = require("../buzzardNative/core/tax/countryRegistry");
const { isSalesEnabled } = require("../salesMode");

const updates = new Map();
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
    model: "DROPSHIP",
    ownsStock: false,
    warehouseQty: null,
    available: null,
    publishStock: null,
    saleable: false,
    purchasable: false,
    reserved: false,
    purchased: false,
    stockDecremented: false,
    supplierConfirmed: false,
    live: false,
    productionReady: false,
    callerFlagIgnored: true,
    duplicate: false,
    attempts: 1,
    ...extra,
  };
}

function wholeQty(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value)) return null;
  return value;
}

function assessSupplierStock(input = {}) {
  const sku = input.sku ? String(input.sku) : "";
  const productSku = input.productSku == null ? sku : String(input.productSku);
  const supplierId = input.supplierId ? String(input.supplierId) : "";
  const saleCountry = countryCode(input.country);
  const stockCountry = countryCode(input.stockCountry);
  const key = input.idempotencyKey || `${supplierId}:${sku}:${stockCountry || ""}:${saleCountry || ""}`;
  if (updates.has(key) && input.action !== "retry") {
    const prior = updates.get(key);
    return closed("DUPLICATE_STOCK_UPDATE", prior.status, {
      ...prior,
      code: "DUPLICATE_STOCK_UPDATE",
      duplicate: true,
      available: null,
      publishStock: null,
      reserved: false,
      purchased: false,
    });
  }

  const reasons = [];
  if (!isSalesEnabled()) reasons.push("SALES_CLOSED");
  if (input.mock === true || input.demo === true || input.synthetic === true || input.source === "mock" || input.source === "DEMO") {
    reasons.push("MOCK_STOCK");
  }
  if (!sku || !supplierId || !input.productId || sku !== productSku) reasons.push("STOCK_RELATION_MISMATCH");
  const qty = wholeQty(input.quantity);
  const reported = input.reportedQty == null ? qty : wholeQty(input.reportedQty);
  if (qty == null || qty < 0) reasons.push("QTY_REJECTED");
  else if (reported != null && reported !== qty) reasons.push("STOCK_CONFLICT");
  if (!stockCountry || !saleCountry) reasons.push("COUNTRY_STOCK_UNKNOWN");
  else if (stockCountry !== saleCountry) reasons.push("COUNTRY_STOCK_MISMATCH");
  const observed = Date.parse(String(input.observedAt || ""));
  if (!Number.isFinite(observed) || Date.now() - observed > STALE_MS) reasons.push("STALE_STOCK");
  if (input.customerOrderVerified !== true || input.customerApproved !== true) reasons.push("ORDER_UNVERIFIED");
  reasons.push("STOCK_UNVERIFIED");
  reasons.push("SUPPLIER_STOCK_UNVERIFIED");
  if (input.timeout === true || input.forceTimeout === true) reasons.unshift("TIMEOUT");
  if (input.networkError === true) reasons.unshift("NETWORK_ERROR");

  const code = reasons.find((reason) => reason !== "SALES_CLOSED") || "SALES_CLOSED";
  const status = code === "TIMEOUT" || code === "NETWORK_ERROR" ? "FAILED" : code === "STALE_STOCK" || code === "STOCK_UNVERIFIED" || code === "COUNTRY_STOCK_UNKNOWN" ? "UNKNOWN" : "BLOCKED";
  const result = closed(code, status, {
    reasons,
    sku: sku || null,
    supplierId: supplierId || null,
    productId: input.productId || null,
    country: saleCountry,
    stockCountry,
    countryMatch: Boolean(saleCountry && stockCountry && saleCountry === stockCountry),
    reportedQty: null,
    reservationIsStock: false,
  });
  updates.set(key, result);
  return result;
}

function retryStockUpdate(key) {
  const prior = key ? updates.get(key) : null;
  if (!prior) return closed("RETRY_UNKNOWN", "UNKNOWN", { attempts: 0 });
  const next = closed(prior.status === "FAILED" ? prior.code : "RETRY_NOT_APPLIED", prior.status === "FAILED" ? "FAILED" : prior.status, {
    ...prior,
    attempts: (prior.attempts || 1) + 1,
    code: prior.status === "FAILED" ? prior.code : "RETRY_NOT_APPLIED",
    available: null,
    publishStock: null,
    reserved: false,
    purchased: false,
    duplicate: false,
  });
  updates.set(key, next);
  return next;
}

module.exports = {
  assessSupplierStock,
  retryStockUpdate,
};
