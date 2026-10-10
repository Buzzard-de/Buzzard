/**
 * Product → Inventory → Pricing → Cart snapshot → Checkout → Order preparation.
 * Payment/supplier remain DRY_RUN. Does not enable sales.
 */
const crypto = require("crypto");
const { db } = require("../db");
const productService = require("../productService");
const inventory = require("./inventoryIntegration");
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
  const inv = inventory.getInventory(product.id);
  const price = pricing.quotePrice({ productId: product.id, supplierCost: product.price });
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
  if (inv.saleable < quantity) {
    exceptions.emit({
      type: exceptions.TYPES.CART_STOCK_CONFLICT,
      source: "coreEngineChain",
      entity: "product",
      entityId: product.id,
      message: "Cart quantity exceeds saleable",
      context: { quantity, saleable: inv.saleable },
      retryable: true,
    });
    return { ok: false, error: "insufficient_saleable", status: 409, saleable: inv.saleable };
  }

  return {
    ok: true,
    item: {
      productId: product.id,
      sku: product.sku,
      quantity,
      unitPrice: Number(product.price),
      currency: product.currency || "EUR",
      vat: price.vatAmount,
      snapshotVersion: snapshotVersion(product),
    },
    productSnapshot: {
      id: product.id,
      sku: product.sku,
      ean: product.ean,
      title: product.title,
      status: product.status,
      updatedAt: product.updatedAt,
    },
    priceSnapshot: price,
    inventorySnapshot: inv,
    ...label(MODE.DRY_RUN),
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
  const vatValid = Number.isFinite(Number(snap.priceSnapshot.vatRate));
  const shippingValid = Boolean(shippingMethod) && Boolean(country);
  return {
    ok: vatValid && shippingValid,
    checks: {
      productExists: true,
      productActive: true,
      priceValid: true,
      stockValid: true,
      vatValid,
      shippingValid,
    },
    snapshot: snap,
    payment: { mode: MODE.DRY_RUN, capture: false, ...label(MODE.DRY_RUN) },
    salesEnabled: isSalesEnabled(),
    ...label(MODE.DRY_RUN),
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

  const reserved = inventory.reserve({
    productId: checkout.snapshot.item.productId,
    quantity,
    correlationId,
    idempotencyKey: correlationId ? `ordprep_${correlationId}` : null,
  });
  if (!reserved.ok) return reserved;

  const id = `ordprep_${crypto.randomBytes(6).toString("hex")}`;
  db.prepare(
    `
    INSERT INTO order_sot_preparations(
      id, product_id, sku, quantity, product_snapshot_json, price_snapshot_json,
      tax_snapshot_json, inventory_snapshot_json, supplier_snapshot_json,
      correlation_id, status, mode
    ) VALUES (?,?,?,?,?,?,?,?,?,?, 'PREPARED', ?)
  `
  ).run(
    id,
    checkout.snapshot.item.productId,
    checkout.snapshot.item.sku,
    quantity,
    JSON.stringify(checkout.snapshot.productSnapshot),
    JSON.stringify(checkout.snapshot.priceSnapshot),
    JSON.stringify({ vatRate: checkout.snapshot.priceSnapshot.vatRate, vatAmount: checkout.snapshot.item.vat }),
    JSON.stringify(reserved.inventory),
    JSON.stringify({ supplierId: null, mode: MODE.DRY_RUN }),
    correlationId,
    MODE.DRY_RUN
  );

  events.emit({
    type: events.TYPES.OrderPrepared,
    aggregateId: id,
    aggregateType: "order",
    correlationId,
    payload: { id, productId: checkout.snapshot.item.productId, salesEnabled: isSalesEnabled() },
  });

  return {
    ok: true,
    preparationId: id,
    customerId,
    reservationId: reserved.reservationId,
    snapshots: {
      product: checkout.snapshot.productSnapshot,
      price: checkout.snapshot.priceSnapshot,
      inventory: reserved.inventory,
      tax: { vatRate: checkout.snapshot.priceSnapshot.vatRate },
      supplier: { mode: MODE.DRY_RUN },
    },
    commercialFulfillment: false,
    salesGate: "LOCKED",
    ...label(MODE.DRY_RUN),
  };
}

module.exports = {
  buildLineSnapshot,
  addCanonicalCartItem,
  validateCheckoutCanonical,
  prepareOrder,
};
