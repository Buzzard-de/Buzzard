/**
 * Read-only / gated calls into existing business engines.
 * Never invents prices, stock, or orders.
 */
const productSearch = require("../commerce/productSearchAbstraction");
const pricing = require("../commerce/pricingIntegration");
const inventory = require("../commerce/inventoryIntegration");
const productService = require("../productService");
const pusat = require("../pusat/runtime");
const { db } = require("../db");

const NO_STOCK_BEFORE_ORDER = "NO_STOCK_BEFORE_CUSTOMER_ORDER";

function searchCatalog(q) {
  return productSearch.searchProducts({ q: String(q || "").slice(0, 120), publicOnly: true, limit: 8 });
}

function getProduct(id) {
  if (pusat.isEnabled()) {
    return pusat.executeReadOnly(pusat.ACTIONS.GET_PRODUCT, { id });
  }
  const product = productService.getProduct(id) || productService.getProductBySku(id);
  if (!product) return { ok: false, code: "NOT_FOUND" };
  return {
    ok: true,
    data: {
      id: product.id,
      sku: product.sku,
      title: product.title || product.name,
      stock: product.stock,
      status: product.status,
    },
    source: "product_engine",
  };
}

function getPrice(productId) {
  if (pusat.isEnabled()) {
    return pusat.executeReadOnly(pusat.ACTIONS.GET_PRICE, { productId });
  }
  const quote = pricing.quotePrice({ productId });
  if (!quote.productId) return { ok: false, code: "NOT_FOUND", engine: "pricing" };
  return { ok: true, data: quote, source: "pricing_engine" };
}

function getStock(productId) {
  if (pusat.isEnabled()) {
    return pusat.executeReadOnly(pusat.ACTIONS.GET_INVENTORY, { productId });
  }
  const inv = inventory.getInventory(productId);
  if (inv.error) return { ok: false, code: "NOT_FOUND", engine: "inventory" };
  return { ok: true, data: inv, source: "inventory_engine" };
}

function getOrderStatus(orderId) {
  if (pusat.isEnabled()) {
    return pusat.executeReadOnly(pusat.ACTIONS.GET_ORDER_STATUS, { orderId });
  }
  try {
    const { createCanonicalOrderFacade } = require("../canonicalOrderFacade");
    const lookup = createCanonicalOrderFacade().getOrder(orderId);
    if (!lookup.ok) return { ok: false, code: "NOT_FOUND", store: lookup.store };
    return {
      ok: true,
      data: { id: lookup.order.id, status: lookup.order.status },
      source: "order_engine",
    };
  } catch (error) {
    return { ok: false, code: "ENGINE_ERROR", message: error.message };
  }
}

function lookupVehicle(query) {
  const q = `%${String(query || "").slice(0, 80)}%`;
  let vehicles = [];
  try {
    vehicles = db
      .prepare(
        "SELECT id, make, model, year_from, year_to, engine FROM vehicles WHERE make LIKE ? OR model LIKE ? OR engine LIKE ? LIMIT 8"
      )
      .all(q, q, q);
  } catch {
    vehicles = [];
  }
  let compatibility = [];
  try {
    compatibility = db
      .prepare(
        "SELECT product_sku, vehicle_id, status FROM compatibility LIMIT 20"
      )
      .all();
  } catch {
    compatibility = [];
  }
  return { ok: true, data: { vehicles, compatibilityCount: compatibility.length }, source: "vehicle_tecdoc" };
}

function blockSupplierPurchase({ customerOrderId } = {}) {
  if (!customerOrderId) {
    return {
      ok: false,
      code: NO_STOCK_BEFORE_ORDER,
      blocked: true,
      message: "AI must not purchase supplier stock without a customer order.",
    };
  }
  return {
    ok: false,
    code: "APPROVAL_REQUIRED",
    blocked: true,
    message: "Supplier fulfillment may run only after a customer order and human approval.",
  };
}

function getSupplierOffers(sku) {
  try {
    const rows = db
      .prepare(
        "SELECT id, supplier_id, supplier_sku, buzzard_sku, stock, cost_eur FROM supplier_products WHERE supplier_sku = ? OR buzzard_sku = ? LIMIT 10"
      )
      .all(String(sku || ""), String(sku || ""));
    return { ok: true, data: { offers: rows, purchaseBlocked: true }, source: "supplier_engine" };
  } catch {
    return { ok: true, data: { offers: [], purchaseBlocked: true }, source: "supplier_engine" };
  }
}

module.exports = {
  searchCatalog,
  getProduct,
  getPrice,
  getStock,
  getOrderStatus,
  lookupVehicle,
  blockSupplierPurchase,
  getSupplierOffers,
  NO_STOCK_BEFORE_ORDER,
};
