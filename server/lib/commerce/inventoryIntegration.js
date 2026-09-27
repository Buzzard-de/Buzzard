/**
 * Inventory projection on canonical Product D.
 * Shadow reservations only — does not mutate pim_core_products.stock or call suppliers.
 */
const crypto = require("crypto");
const { db } = require("../db");
const productService = require("../productService");
const events = require("../eventBus");
const exceptions = require("../exceptionBus");
const { applySafetyStock } = require("../pricing");
const { MODE, label } = require("../integrationMode");

function getInventory(productId) {
  const product = productService.getProduct(productId);
  if (!product) return { error: "product_not_found", status: 404 };
  const reserved = db
    .prepare(
      "SELECT COALESCE(SUM(quantity),0) n FROM inventory_sot_reservations WHERE product_id = ? AND status = 'RESERVED'"
    )
    .get(product.id).n;
  const available = Math.max(0, Number(product.stock) || 0);
  const safetyStock = Number(product.metadata?.safetyStock || 0);
  const saleable = Math.max(0, available - reserved - safetyStock);
  const safety = applySafetyStock(available, safetyStock);
  return {
    productId: product.id,
    sku: product.sku,
    available,
    reserved,
    committed: 0,
    incoming: 0,
    safetyStock,
    saleable,
    stockStatus: safety.stock_status,
    known: product.stock != null,
    saleableIfUnknown: false,
    ...label(MODE.DRY_RUN),
  };
}

function reserve({ productId, quantity, correlationId = null, idempotencyKey = null } = {}) {
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    return { ok: false, error: "invalid_quantity", status: 400, ...label(MODE.DRY_RUN) };
  }

  if (idempotencyKey) {
    const existing = db
      .prepare("SELECT * FROM inventory_sot_reservations WHERE idempotency_key = ?")
      .get(idempotencyKey);
    if (existing) return { ok: true, duplicate: true, reservation: existing, ...label(MODE.DRY_RUN) };
  }

  const tx = db.transaction(() => {
    const inv = getInventory(productId);
    if (inv.error) return inv;
    if (inv.saleable < qty) {
      exceptions.emit({
        type: exceptions.TYPES.INVENTORY_CONFLICT,
        severity: "HIGH",
        source: "inventoryIntegration",
        entity: "product",
        entityId: inv.productId,
        correlationId,
        message: "Reservation exceeds saleable quantity",
        context: { requested: qty, saleable: inv.saleable },
        retryable: true,
      });
      return { ok: false, error: "insufficient_saleable", saleable: inv.saleable, status: 409, ...label(MODE.DRY_RUN) };
    }
    const id = `rsv_${crypto.randomBytes(6).toString("hex")}`;
    db.prepare(
      `
      INSERT INTO inventory_sot_reservations(
        id, product_id, sku, quantity, status, correlation_id, idempotency_key
      ) VALUES (?,?,?,?, 'RESERVED', ?, ?)
    `
    ).run(id, inv.productId, inv.sku, qty, correlationId, idempotencyKey);
    const after = getInventory(inv.productId);
    events.emit({
      type: events.TYPES.InventoryUpdated,
      aggregateId: inv.productId,
      aggregateType: "inventory",
      correlationId,
      payload: { productId: inv.productId, reserved: after.reserved, saleable: after.saleable },
    });
    return { ok: true, reservationId: id, inventory: after, ...label(MODE.DRY_RUN) };
  });

  return tx();
}

function release(reservationId) {
  const row = db.prepare("SELECT * FROM inventory_sot_reservations WHERE id = ?").get(reservationId);
  if (!row) return { ok: false, error: "not_found", status: 404 };
  db.prepare("UPDATE inventory_sot_reservations SET status = 'RELEASED' WHERE id = ?").run(reservationId);
  return { ok: true, inventory: getInventory(row.product_id), ...label(MODE.DRY_RUN) };
}

module.exports = { getInventory, reserve, release };
