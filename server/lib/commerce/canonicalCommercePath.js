/**
 * Adapter: existing cart/checkout/order services → Product D chain.
 *
 * OLD SERVICE              → CANONICAL              → CALLERS              → CHANGE
 * cartService.addItem      → productService + D    → commerceCorePlugin   → snapshot + reject client overrides
 * cartService.getCart      → D price/inventory     → checkout/order       → expose immutable snapshots
 * checkoutService.validate → D + inventory + VAT   → commerceCorePlugin   → fail closed
 * checkoutService.complete → orderService + reserve→ commerceCorePlugin   → DRY_RUN payment, no capture
 * orderService.create      → D snapshots           → checkoutService      → historical snapshots
 * paymentService.intent    → authorize DRY_RUN     → checkoutService      → capture fail-closed
 *
 * Does not activate sales, Exclusive SoT, or live payment/supplier.
 */
const productService = require("../productService");
const pricing = require("./pricingIntegration");
const events = require("../eventBus");
const exceptions = require("../exceptionBus");
const { db } = require("../db");
const { MODE, label } = require("../integrationMode");
const { isSalesEnabled } = require("../salesMode");

function rejectClientOverrides(body = {}) {
  if (body.clientVat !== undefined || body.vat !== undefined || body.clientTax !== undefined) {
    return { ok: false, code: "PRICE_INVALID", error: "client_vat_rejected", status: 400 };
  }
  if (body.clientStock !== undefined || body.stock !== undefined) {
    return { ok: false, code: "INVENTORY_INSUFFICIENT", error: "client_stock_rejected", status: 400 };
  }
  if (body.clientSupplier !== undefined || body.supplierId !== undefined || body.supplier !== undefined) {
    return { ok: false, code: "CHECKOUT_INVALID", error: "client_supplier_rejected", status: 400 };
  }
  return { ok: true };
}

function identityConflict(productId) {
  if (!productId) return null;
  return db
    .prepare(
      `SELECT * FROM product_identity_map
       WHERE (target_product_id = ? OR source_id = ?)
         AND collision_status IN ('CONFIRMED','POSSIBLE')
       LIMIT 1`
    )
    .get(productId, productId);
}

function emitPath(type, aggregateType, aggregateId, payload, correlationId) {
  return events.emit({
    type,
    aggregateType,
    aggregateId,
    payload,
    correlationId,
    version: 1,
  });
}

function buildImmutableSnapshot(productId, quantity = 1) {
  const product = productService.getProduct(productId);
  if (!product) {
    exceptions.emit({
      type: exceptions.TYPES.PRODUCT_NOT_FOUND,
      source: "canonicalCommercePath",
      entity: "product",
      entityId: String(productId),
      message: "Canonical product not found",
      retryable: false,
    });
    return { ok: false, code: "PRODUCT_NOT_FOUND", error: "product_not_found", status: 404 };
  }

  const conflict = identityConflict(product.id);
  if (conflict) {
    exceptions.emit({
      type: exceptions.TYPES.PRODUCT_IDENTITY_CONFLICT,
      source: "canonicalCommercePath",
      entity: "product",
      entityId: product.id,
      message: "Identity collision blocks commerce path",
      retryable: false,
    });
    return { ok: false, code: "PRODUCT_IDENTITY_CONFLICT", error: "identity_conflict", status: 409 };
  }

  if (product.status === "ARCHIVED" || product.status === "BLOCKED") {
    return { ok: false, code: "CHECKOUT_INVALID", error: "product_not_active", status: 409 };
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
      snapshotVersion: `${product.id}:${product.updatedAt || "v1"}`,
      productSnapshot: {
        id: product.id,
        sku: product.sku,
        ean: product.ean,
        title: product.title,
        status: product.status,
        updatedAt: product.updatedAt,
      },
    };
  }
  if (!price.valid || !(Number(product.price) > 0)) {
    exceptions.emit({
      type: exceptions.TYPES.PRICE_INVALID,
      source: "canonicalCommercePath",
      entity: "product",
      entityId: product.id,
      message: "Invalid canonical price",
      retryable: false,
    });
    return { ok: false, code: "PRICE_INVALID", error: "invalid_price", status: 400 };
  }

  return {
    ok: false,
    code: isSalesEnabled() ? "STOCK_UNVERIFIED" : "SALES_CLOSED",
    error: isSalesEnabled() ? "STOCK_UNVERIFIED" : "SALES_CLOSED",
    status: isSalesEnabled() ? 409 : 403,
    reasons: ["SALES_CLOSED", "STOCK_UNVERIFIED", "SUPPLIER_COST_UNVERIFIED", "ORDER_UNVERIFIED"],
    orderCreated: false,
    reserved: false,
    purchased: false,
    commerciallyEligible: false,
    salesEnabled: isSalesEnabled(),
    productSnapshot: {
      id: product.id,
      sku: product.sku,
      title: product.title,
      status: product.status,
    },
    priceSnapshot: price,
  };
}

function validateCheckoutLines(items = []) {
  for (const item of items) {
    const snap = buildImmutableSnapshot(item.productId, item.quantity);
    if (!snap.ok) return snap;
  }
  return {
    ok: false,
    code: isSalesEnabled() ? "STOCK_UNVERIFIED" : "SALES_CLOSED",
    error: isSalesEnabled() ? "STOCK_UNVERIFIED" : "SALES_CLOSED",
    orderCreated: false,
    checkoutAllowed: false,
  };
}

module.exports = {
  rejectClientOverrides,
  identityConflict,
  buildImmutableSnapshot,
  validateCheckoutLines,
  emitPath,
};
