let bridge = null;

function loadBridge() {
  if (bridge) return bridge;
  try {
    bridge = require("../commerceOrderEngineBridge.bundle.cjs");
    return bridge;
  } catch (err) {
    console.warn("Commerce Order Engine bridge unavailable:", err.message);
    return null;
  }
}

function buildSyncInput(commerceOrder, checkout, idempotencyKey) {
  const mod = loadBridge();
  if (!mod) return null;

  const shippingWrap = checkout.shipping || {};
  const shippingAddress = mod.mapCommerceAddressToSnapshot(
    shippingWrap.address || shippingWrap || checkout.billing || {}
  );
  const marketId = (shippingAddress.country || checkout.totals?.country || "DE").toUpperCase();

  return {
    commerceOrderId: commerceOrder.id,
    checkoutId: checkout.id,
    customerId: checkout.customerId || commerceOrder.customerId,
    marketId,
    channel: "direct",
    language: checkout.metadata?.language || "de",
    currency: commerceOrder.currency || checkout.totals?.currency || "EUR",
    items: (commerceOrder.items || []).map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    })),
    shippingAddress,
    idempotencyKey: idempotencyKey || checkout.idempotencyKey || commerceOrder.id,
  };
}

async function syncCommerceOrderAfterCheckout(commerceOrder, checkout, options = {}) {
  const mod = loadBridge();
  if (!mod) {
    return { ok: false, errorCode: "ORDER_ENGINE_BRIDGE_UNAVAILABLE", nonBlocking: true };
  }

  try {
    const input = buildSyncInput(commerceOrder, checkout, options.idempotencyKey);
    if (!input) return { ok: false, errorCode: "ORDER_ENGINE_BRIDGE_UNAVAILABLE", nonBlocking: true };
    const result = await mod.syncCommerceOrderToEngine(input);
    return result;
  } catch (err) {
    return {
      ok: false,
      errorCode: "ORDER_ENGINE_SYNC_FAILED",
      errorMessage: err.message,
      nonBlocking: true,
    };
  }
}

function persistOrderEngineLink(commerceOrderId, orderEngineOrderId) {
  const { db } = require("../db");
  const row = db.prepare("SELECT metadata_json FROM commerce_orders WHERE id = ?").get(commerceOrderId);
  if (!row) return;
  let metadata = {};
  try {
    metadata = JSON.parse(row.metadata_json || "{}");
  } catch {
    metadata = {};
  }
  metadata.orderEngineOrderId = orderEngineOrderId;
  metadata.orderEngineSyncedAt = new Date().toISOString();
  db.prepare("UPDATE commerce_orders SET metadata_json = ? WHERE id = ?").run(
    JSON.stringify(metadata),
    commerceOrderId
  );
}

function getEngineOrderIdFromDb(commerceOrderId) {
  const { db } = require("../db");
  const row = db.prepare("SELECT metadata_json, customer_id FROM commerce_orders WHERE id = ?").get(commerceOrderId);
  if (!row) return null;
  try {
    const metadata = JSON.parse(row.metadata_json || "{}");
    if (!metadata.orderEngineOrderId) return null;
    return {
      orderEngineOrderId: metadata.orderEngineOrderId,
      customerId: row.customer_id || undefined,
    };
  } catch {
    return null;
  }
}

function resolveOrderIdForAnalytics(orderIdOrCommerceId) {
  if (!orderIdOrCommerceId) return null;

  const mod = loadBridge();
  if (mod?.resolveOrderEngineOrderId) {
    const inMemory = mod.resolveOrderEngineOrderId(orderIdOrCommerceId);
    if (inMemory) return inMemory;
  }

  if (mod?.getOrder) {
    const direct = mod.getOrder(orderIdOrCommerceId);
    if (direct?.orderId) return direct.orderId;
  }

  const dbLink = getEngineOrderIdFromDb(orderIdOrCommerceId);
  if (dbLink?.orderEngineOrderId) return dbLink.orderEngineOrderId;

  return null;
}

function getCommerceOrderContext(commerceOrderId) {
  return getEngineOrderIdFromDb(commerceOrderId);
}

module.exports = {
  syncCommerceOrderAfterCheckout,
  persistOrderEngineLink,
  resolveOrderIdForAnalytics,
  getCommerceOrderContext,
  getEngineOrderIdFromDb,
};
