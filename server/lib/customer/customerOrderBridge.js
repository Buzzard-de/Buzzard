/**
 * Part 19 — Bridge customer account orders from commerce_orders + legacy JSON.
 * No fourth order store — read-only aggregation.
 */
const fs = require("fs");
const path = require("path");
const { db } = require("../db");
const orderService = require("../commerce/orderService");
const { ORDER_TYPE } = require("../../core/commerceConstants");

const legacyOrdersFile = path.join(__dirname, "..", "data", "orders.json");

function readLegacyOrders() {
  if (!fs.existsSync(legacyOrdersFile)) return [];
  try {
    return JSON.parse(fs.readFileSync(legacyOrdersFile, "utf8") || "[]");
  } catch {
    return [];
  }
}

function mapCommerceOrder(row) {
  const order = orderService.mapOrder(row);
  const meta = order.metadata || {};
  return {
    id: order.id,
    orderNumber: order.id,
    source: "commerce_orders",
    orderType: order.orderType,
    status: order.status,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    currency: order.currency,
    total: order.total,
    items: order.items,
    customerId: order.customerId,
    createdAt: order.createdAt,
    dryRun: Boolean(meta.dryRun),
    testOnly: order.orderType !== ORDER_TYPE.COMMERCIAL,
    realMoneyMovement: Boolean(meta.realMoneyMovement),
    commercial: order.isCommercial,
  };
}

function listCommerceOrdersForCustomer(customerId) {
  if (!customerId) return [];
  const rows = db
    .prepare("SELECT * FROM commerce_orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 200")
    .all(customerId);
  return rows.map(mapCommerceOrder);
}

function getCommerceOrderForCustomer(orderId, customerId) {
  const row = db.prepare("SELECT * FROM commerce_orders WHERE id = ?").get(orderId);
  if (!row) return null;
  if (customerId && row.customer_id && row.customer_id !== customerId) return null;
  return mapCommerceOrder(row);
}

function sanitizeLegacyOrder(order) {
  const clone = { ...order, source: "legacy_orders_json" };
  delete clone.paymentTransactionId;
  return clone;
}

function listCustomerOrders(customerId, email) {
  const legacy = readLegacyOrders()
    .filter((o) => o.customerId === customerId || (email && o.customer?.email === email))
    .map(sanitizeLegacyOrder);

  const commerce = listCommerceOrdersForCustomer(customerId);

  const merged = [...commerce, ...legacy];
  merged.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  return merged;
}

function getCustomerOrder(orderNumber, customerId, email) {
  const commerce = getCommerceOrderForCustomer(orderNumber, customerId);
  if (commerce) return commerce;

  const legacy = readLegacyOrders().find((o) => o.orderNumber === orderNumber);
  if (!legacy) return null;
  const owns = legacy.customerId === customerId || (email && legacy.customer?.email === email);
  if (!owns) return null;
  return sanitizeLegacyOrder(legacy);
}

function getOrderHistoryReadiness() {
  const commerceCount = db.prepare("SELECT COUNT(*) n FROM commerce_orders").get()?.n ?? 0;
  const legacyCount = readLegacyOrders().length;
  return {
    sources: ["commerce_orders", "legacy_orders_json"],
    bridgeEnabled: true,
    commerceOrderCount: commerceCount,
    legacyOrderCount: legacyCount,
    realOrdersEnabled: false,
    commercialOrdersWhileSalesOff: orderService.getCommercialOrderCount() === 0,
  };
}

module.exports = {
  listCustomerOrders,
  getCustomerOrder,
  getOrderHistoryReadiness,
  mapCommerceOrder,
};
