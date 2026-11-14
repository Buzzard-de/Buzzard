/**
 * Product → Inventory → Pricing → Cart snapshot → Checkout → Order preparation.
 * Payment/supplier remain DRY_RUN. Does not enable sales.
 */
const crypto = require("crypto");
const { db } = require("../db");
const productService = require("../productService");
const pricing = require("./pricingIntegration");
const cartService = require("./cartService");
const events = require("../eventBus");
const exceptions = require("../exceptionBus");
const { MODE, label } = require("../integrationMode");
const { isSalesEnabled } = require("../salesMode");

function snapshotVersion(product) {
  return `${product.id}:${product.updatedAt || "v1"}`;
}

function buildLineSnapshot(productId, quantity = 1) {
  const product = productService.getProduct(productId);
  if (!product) return { ok: false, error: "product_not_found", status: 404 };
  if (product.status === "ARCHIVED" || product.status === "BLOCKED") {
    return { ok: false, error: "product_not_active", status: 409, productId: product.id };
  }
  const price = pricing.quotePrice({
    productId: product.id,
    offerPrice: Number(product.price),
    supplierCost: pricing.readSupplierCost(product),
    currency: product.currency || "EUR",
  });
  if (!pricing.priceAcceptedForCheckout(price)) {
    return {
      ok: false,
      code: "PRICE_POLICY_BLOCKED",
      error: "price_policy_blocked",
      status: 409,
      policyStatus: price.policyStatus || "UNKNOWN",
      orderCreated: false,
      salesEnabled: isSalesEnabled(),
      commerciallyEligible: false,
      priceSnapshot: price,
    };
  }
  if (!price.valid || !(Number(product.price) > 0)) {
    exceptions.emit({
      type: exceptions.TYPES.PRICE_CONFLICT,
      source: "coreEngineChain",
      entity: "product",
      entityId: product.id,
      message: "Invalid canonical price",
      retryable: false,
    });
    return { ok: false, error: "invalid_price", status: 400 };
  }
  return {
    ok: false,
    code: isSalesEnabled() ? "STOCK_UNVERIFIED" : "SALES_CLOSED",
    error: isSalesEnabled() ? "STOCK_UNVERIFIED" : "SALES_CLOSED",
    status: isSalesEnabled() ? 409 : 403,
    orderCreated: false,
    reserved: false,
    purchased: false,
    commerciallyEligible: false,
    salesEnabled: isSalesEnabled(),
    inventoryVerified: false,
  };
}

function addCanonicalCartItem({ cartId, productId, quantity = 1, customerId, req } = {}) {
  const snap = buildLineSnapshot(productId, quantity);
  if (!snap.ok) return snap;
  if (!cartId) {
    const created = cartService.createCart({ customerId });
    cartId = created.cart.id;
    events.emit({
      type: events.TYPES.CartCreated,
      aggregateId: cartId,
      aggregateType: "cart",
      payload: { cartId },
    });
  }
  const added = cartService.addItem(cartId, {
    productId: snap.item.productId,
    quantity,
    metadata: { snapshotVersion: snap.item.snapshotVersion, source: "D" },
    customerId,
    req,
  });
  if (!added.error) {
    events.emit({
      type: events.TYPES.CartUpdated,
      aggregateId: cartId,
      aggregateType: "cart",
      payload: { cartId, productId: snap.item.productId },
    });
  }
  return { ...added, canonical: snap, ...label(MODE.DRY_RUN) };
}

function validateCheckoutCanonical({ productId, quantity = 1, country = "DE", shippingMethod = "standard" } = {}) {
  const snap = buildLineSnapshot(productId, quantity);
  if (!snap.ok) {
    exceptions.emit({
      type: exceptions.TYPES.CHECKOUT_VALIDATION_FAILED,
      source: "coreEngineChain",
      entity: "checkout",
      message: snap.error,
      context: { productId },
      retryable: false,
    });
    return { ok: false, ...snap };
  }
  return {
    ok: false,
    code: isSalesEnabled() ? "STOCK_UNVERIFIED" : "SALES_CLOSED",
    error: isSalesEnabled() ? "STOCK_UNVERIFIED" : "SALES_CLOSED",
    stockValid: false,
    checkoutAllowed: false,
    orderCreated: false,
    paymentAuthorized: false,
    salesEnabled: isSalesEnabled(),
    snapshot: snap,
  };
}

function prepareOrder({ productId, quantity = 1, customerId = null, correlationId = null } = {}) {
  const checkout = validateCheckoutCanonical({ productId, quantity });
  if (!checkout.ok) {
    exceptions.emit({
      type: exceptions.TYPES.ORDER_PREPARATION_FAILED,
      source: "coreEngineChain",
      entity: "order",
      message: checkout.error || "checkout invalid",
      retryable: false,
    });
    return { ok: false, ...checkout };
  }

  return {
    ok: false,
    code: isSalesEnabled() ? "PAYMENT_UNVERIFIED" : "SALES_CLOSED",
    status: "BLOCKED_EXTERNAL",
    orderCreated: false,
    prepared: false,
    commercialFulfillment: false,
    salesEnabled: isSalesEnabled(),
    live: false,
    customerNotified: false,
  };

}

module.exports = {
  buildLineSnapshot,
  addCanonicalCartItem,
  validateCheckoutCanonical,
  prepareOrder,
};
