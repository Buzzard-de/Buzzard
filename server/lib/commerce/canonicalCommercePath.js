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
const inventory = require("./inventoryIntegration");
const pricing = require("./pricingIntegration");
const events = require("../eventBus");
const exceptions = require("../exceptionBus");
const { db } = require("../db");
const { MODE, label } = require("../integrationMode");

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

  const price = pricing.quotePrice({ productId: product.id, supplierCost: product.price });
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

  const inv = inventory.getInventory(product.id);
  if (inv.saleable < quantity) {
    exceptions.emit({
      type: exceptions.TYPES.INVENTORY_INSUFFICIENT,
      source: "canonicalCommercePath",
      entity: "product",
      entityId: product.id,
      message: "Insufficient saleable inventory",
      context: { quantity, saleable: inv.saleable },
      retryable: true,
    });
    return {
      ok: false,
      code: "INVENTORY_INSUFFICIENT",
      error: "insufficient_saleable",
      status: 409,
      saleable: inv.saleable,
    };
  }

  emitPath(events.TYPES.ProductResolved, "product", product.id, { sku: product.sku });
  emitPath(events.TYPES.PriceResolved, "price", product.id, { unitPrice: Number(product.price) });
  emitPath(events.TYPES.InventoryChecked, "inventory", product.id, { saleable: inv.saleable });

  const snapshotVersion = `${product.id}:${product.updatedAt || "v1"}`;
  return {
    ok: true,
    item: {
      productId: product.id,
      sku: product.sku,
      quantity,
      unitPrice: Number(product.price),
      currency: product.currency || "EUR",
      vat: price.vatAmount,
      snapshotVersion,
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
    taxSnapshot: { vatRate: price.vatRate, vatAmount: price.vatAmount },
    inventorySnapshot: inv,
    supplierSnapshot: { supplierId: product.supplier || null, mode: MODE.DRY_RUN },
    snapshotVersion,
    ...label(MODE.DRY_RUN),
  };
}

function validateCheckoutLines(items = []) {
  for (const item of items) {
    const snap = buildImmutableSnapshot(item.productId, item.quantity);
    if (!snap.ok) return snap;
  }
  return { ok: true };
}

module.exports = {
  rejectClientOverrides,
  identityConflict,
  buildImmutableSnapshot,
  validateCheckoutLines,
  emitPath,
};
