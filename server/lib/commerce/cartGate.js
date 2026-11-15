/**
 * Local cart gate. A cart line is not an order, a reservation, or a purchase.
 */
const { getCountry } = require("../buzzardNative/core/tax/countryRegistry");
const { isSalesEnabled } = require("../salesMode");

const updates = new Map();
const lines = new Map();

function countryCode(value) {
  const row = getCountry(value);
  return row ? row.countryCode : null;
}

function closed(code, status, extra = {}) {
  return {
    ok: false,
    code,
    status,
    added: false,
    purchasable: false,
    saleable: false,
    checkoutAllowed: false,
    checkoutStarted: false,
    orderCreated: false,
    reservationCreated: false,
    paymentCreated: false,
    purchased: false,
    reserved: false,
    live: false,
    commercial: false,
    productionReady: false,
    callerFlagIgnored: true,
    duplicate: false,
    attempts: 1,
    priceStatus: "UNKNOWN",
    stockStatus: "UNKNOWN",
    productEligibility: "UNVERIFIED",
    subtotal: null,
    shipping: null,
    vat: null,
    discount: null,
    total: null,
    ...extra,
  };
}

function wholeQty(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value) || value <= 0) return null;
  return value;
}

function planCart(input = {}) {
  const cartId = input.cartId ? String(input.cartId) : "";
  const customerId = input.customerId ? String(input.customerId) : "";
  const cartCustomerId = input.cartCustomerId == null ? customerId : String(input.cartCustomerId);
  const sku = input.sku ? String(input.sku) : "";
  const productSku = input.productSku == null ? sku : String(input.productSku);
  const country = countryCode(input.country);
  const key = input.idempotencyKey || `${cartId}:${customerId}:${sku}`;
  const lineKey = `${cartId}:${customerId}:${sku}`;
  if ((updates.has(key) || lines.has(lineKey)) && input.action !== "retry") {
    const prior = updates.get(key) || lines.get(lineKey);
    return closed("DUPLICATE_CART_ITEM", prior.status, {
      ...prior,
      code: "DUPLICATE_CART_ITEM",
      duplicate: true,
      added: false,
      purchasable: false,
      total: null,
      orderCreated: false,
    });
  }

  const reasons = [];
  if (!isSalesEnabled()) reasons.push("SALES_CLOSED");
  if (input.mock === true || input.demo === true || input.synthetic === true || input.source === "mock" || input.source === "DEMO") {
    reasons.push("MOCK_NOT_COMMERCIAL");
  }
  if (!cartId || !customerId || !sku || !input.productId || customerId !== cartCustomerId || sku !== productSku) {
    reasons.push("CART_RELATION_MISMATCH");
  }
  if (wholeQty(input.quantity) == null) reasons.push("QTY_REJECTED");
  if (!country) reasons.push("COUNTRY_OUT_OF_SCOPE");
  reasons.push("PRODUCT_UNVERIFIED");
  reasons.push("PRODUCT_ELIGIBILITY_UNVERIFIED");
  reasons.push("PRICE_UNKNOWN");
  reasons.push("STOCK_UNKNOWN");
  reasons.push("SHIPPING_UNKNOWN");
  reasons.push("VAT_UNKNOWN");
  reasons.push("DISCOUNT_UNKNOWN");
  if (input.action === "checkout" || input.action === "createOrder") reasons.push("CART_NOT_AN_ORDER");
  if (input.timeout === true || input.forceTimeout === true) reasons.unshift("TIMEOUT");
  if (input.networkError === true) reasons.unshift("NETWORK_ERROR");

  const code = reasons.find((reason) => reason !== "SALES_CLOSED") || "SALES_CLOSED";
  const status = code === "TIMEOUT" || code === "NETWORK_ERROR" ? "FAILED" : "BLOCKED";
  const result = closed(code, status, {
    reasons,
    cartId: cartId || null,
    customerId: customerId && customerId === cartCustomerId ? customerId : null,
    sku: sku && sku === productSku ? sku : null,
    country,
    countryScope: country ? "IN_SCOPE" : "OUT_OF_SCOPE",
    separatedFromOrder: true,
  });
  updates.set(key, result);
  const relationOk = Boolean(cartId && customerId && sku && input.productId && customerId === cartCustomerId && sku === productSku);
  if (relationOk) lines.set(lineKey, result);
  return result;
}

function retryCart(key) {
  const prior = key ? updates.get(key) : null;
  if (!prior) return closed("RETRY_UNKNOWN", "UNKNOWN", { attempts: 0, separatedFromOrder: true });
  const next = closed(prior.status === "FAILED" ? prior.code : "RETRY_NOT_APPLIED", prior.status === "FAILED" ? "FAILED" : prior.status, {
    ...prior,
    attempts: (prior.attempts || 1) + 1,
    code: prior.status === "FAILED" ? prior.code : "RETRY_NOT_APPLIED",
    added: false,
    purchasable: false,
    total: null,
    orderCreated: false,
    reserved: false,
    purchased: false,
    duplicate: false,
  });
  updates.set(key, next);
  return next;
}

module.exports = {
  planCart,
  retryCart,
};
