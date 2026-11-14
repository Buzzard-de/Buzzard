/**
 * Inventory projection on canonical Product D.
 * Shadow reservations only — does not mutate pim_core_products.stock or call suppliers.
 */
const { db } = require("../db");
const productService = require("../productService");
const { MODE, label } = require("../integrationMode");
const { isSalesEnabled } = require("../salesMode");

function refusal(code, reasons, extra = {}) {
  return {
    ok: false,
    code,
    error: code,
    reasons,
    status: code === "SALES_CLOSED" ? 403 : 409,
    reserved: false,
    created: false,
    purchased: false,
    stockDecremented: false,
    supplierConfirmed: false,
    live: false,
    callerFlagIgnored: true,
    ...label(MODE.DRY_RUN),
    ...extra,
  };
}

function getInventory(productId) {
  const product = productService.getProduct(productId);
  if (!product) return { error: "product_not_found", status: 404, saleable: null, purchasable: false, stockVerified: false };
  const reasons = [];
  if (!isSalesEnabled()) reasons.push("SALES_CLOSED");
  reasons.push("STOCK_UNVERIFIED");
  reasons.push("SUPPLIER_COST_UNVERIFIED");
  reasons.push("STALE_STOCK");
  const fixture = product.stock == null || product.stock === "" ? null : Number(product.stock);
  const fixtureStock = Number.isFinite(fixture) ? fixture : null;
  if (fixtureStock == null) reasons.push("UNKNOWN_STOCK", "QTY_UNKNOWN");
  else reasons.push("INVENTORY_SOURCE_CONFLICT", "FALSE_SALEABLE");
  if (product.metadata?.mock === true || product.metadata?.source === "mock" || product.metadata?.source === "DEMO") {
    reasons.push("MOCK_STOCK");
  }
  return {
    ok: false,
    code: reasons[0] || "STOCK_UNVERIFIED",
    productId: product.id,
    sku: product.sku,
    available: null,
    reserved: null,
    committed: null,
    incoming: null,
    safetyStock: null,
    saleable: null,
    fixtureStock,
    fixtureOnly: fixtureStock != null,
    commercialQty: "UNKNOWN",
    stockStatus: "UNKNOWN",
    known: false,
    saleableIfUnknown: false,
    stockVerified: false,
    supplierConfirmed: false,
    purchasable: false,
    observedAt: null,
    reasons,
    callerFlagIgnored: true,
    ...label(MODE.DRY_RUN),
  };
}

function reserve(input = {}) {
  const reasons = [];
  if (!isSalesEnabled()) reasons.push("SALES_CLOSED");
  reasons.push("ORDER_UNVERIFIED");
  reasons.push("STOCK_UNVERIFIED");
  reasons.push("SUPPLIER_COST_UNVERIFIED");
  const observed = input.stockObservedAt || input.observedAt;
  if (!observed || Number.isNaN(Date.parse(String(observed)))) reasons.push("STALE_STOCK");
  if (input.mock === true || input.demo === true || input.source === "mock" || input.source === "DEMO") {
    reasons.push("MOCK_STOCK");
  }
  const key = input.idempotencyKey || null;
  const orderKey = input.orderId || input.correlationId || null;
  const existing = key
    ? db.prepare("SELECT id FROM inventory_sot_reservations WHERE idempotency_key = ?").get(key)
    : orderKey
      ? db.prepare("SELECT id FROM inventory_sot_reservations WHERE correlation_id = ?").get(orderKey)
      : null;
  if (existing) {
    return refusal("DUPLICATE_RESERVATION", reasons.concat("DUPLICATE_RESERVATION"), { duplicate: true });
  }
  return refusal(reasons[0] || "STOCK_UNVERIFIED", reasons);
}

function release(reservationId) {
  const row = db.prepare("SELECT * FROM inventory_sot_reservations WHERE id = ?").get(reservationId);
  if (!row) {
    return { ok: false, code: "RESERVATION_NOT_FOUND", released: false, purchased: false, stockDecremented: false, status: 404 };
  }
  if (row.status !== "RESERVED") {
    return { ok: false, code: "RESERVATION_NOT_ACTIVE", released: false, purchased: false, stockDecremented: false, status: 409 };
  }
  db.prepare("UPDATE inventory_sot_reservations SET status = 'RELEASED' WHERE id = ?").run(reservationId);
  return {
    ok: false,
    code: "RESERVATION_RELEASED",
    released: true,
    purchased: false,
    supplierConfirmed: false,
    stockDecremented: false,
    live: false,
    inventory: getInventory(row.product_id),
  };
}

function expireReservations() {
  return {
    ok: false,
    code: "RESERVATION_EXPIRY_UNVERIFIED",
    expired: 0,
    released: false,
    purchased: false,
    live: false,
  };
}

function decrementStock() {
  return refusal("STOCK_UNVERIFIED", ["SALES_CLOSED", "STOCK_UNVERIFIED"], { decremented: false });
}

module.exports = { getInventory, reserve, release, expireReservations, decrementStock };
