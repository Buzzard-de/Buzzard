/** P1 catalog platform core — order prep mock + platform status (P1-11). */

const orderManagement = require("./orderManagement");
const { isSalesEnabled } = require("./salesMode");
const productStore = require("./productStore");
const supplierAdapter = require("./adapters/supplierAdapter");
const priceStockQueue = require("./priceStockQueue");
const productAi = require("./productAi");

function isEnabled() {
  return process.env.BUZZARD_P1_CATALOG !== "0";
}

function getPlatformStatus() {
  const products = productStore.listProducts();
  return {
    enabled: isEnabled(),
    catalog_mode: !isSalesEnabled(),
    sales_enabled: isSalesEnabled(),
    product_count: products.length,
    active_products: products.filter((p) => p.status === "active").length,
    price_stock_queue: priceStockQueue.listQueue(null, 5).length,
    ai_review_pending: productAi.listReviews("pending", 100).length,
    adapters: supplierAdapter.listAdapters(),
    order_management: orderManagement.isEnabled(),
    message: isSalesEnabled()
      ? "Sales enabled — verify this is intentional."
      : "Catalog mode active — checkout and real supplier dispatch remain disabled.",
  };
}

function seedMockOrder(options = {}) {
  if (isSalesEnabled()) {
    return { ok: false, error: "mock_orders_disabled_when_sales_enabled", status: 403 };
  }
  if (!orderManagement.isEnabled()) {
    return { ok: false, error: "order_management_disabled", status: 503 };
  }

  const products = productStore.listProducts({ status: "active" }).slice(0, 2);
  if (!products.length) {
    return { ok: false, error: "no_products_for_mock_order", status: 400 };
  }

  const items = products.map((p) => ({
    sku: p.sku,
    name: p.name,
    quantity: 1,
    unit_price: Number(p.price?.amount || 0),
  }));

  const result = orderManagement.createOrder({
    channel: "mock",
    customerEmail: options.customerEmail || "mock@buzzard24.de",
    customerName: options.customerName || "Mock Kunde",
    items,
    idempotencyKey: options.idempotencyKey || `mock-${Date.now()}`,
    metadata: { mock: true, catalog_mode: true, note: "Preparation only — no payment or supplier dispatch." },
  });

  if (result.error) return { ok: false, ...result };

  return {
    ok: true,
    mock: true,
    order: result.order,
    message: "Mock order created for OMS prep testing only.",
  };
}

module.exports = {
  isEnabled,
  getPlatformStatus,
  seedMockOrder,
};
