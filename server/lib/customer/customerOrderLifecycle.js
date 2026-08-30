/**
 * Part 19 — Order lifecycle architecture readiness (reuses Part 8 commerce constants).
 */
const { ORDER_STATUS, ORDER_TRANSITIONS, ORDER_TYPE, CHECKOUT_STATE } = require("../../core/commerceConstants");
const customerOrderBridge = require("./customerOrderBridge");
const orderService = require("../commerce/orderService");
const { db } = require("../db");

function getLifecycleModel() {
  return {
    checkoutStates: Object.keys(CHECKOUT_STATE),
    orderStatuses: Object.keys(ORDER_STATUS),
    orderTypes: Object.keys(ORDER_TYPE),
    transitions: Object.fromEntries(
      Object.entries(ORDER_TRANSITIONS).map(([k, v]) => [k, [...v]])
    ),
    primaryStore: "commerce_orders",
    legacyStore: "legacy_orders_json",
    omsStore: "oms_orders (admin)",
  };
}

function getOrderLifecycleReadiness() {
  const counts = orderService.countOrdersByType();
  const commercial = orderService.getCommercialOrderCount();
  return {
    model: getLifecycleModel(),
    orderCountsByType: counts,
    commercialOrderCount: commercial,
    commercialWhileSalesOff: commercial === 0,
    bridgeEnabled: true,
    realMoneyMovement: false,
  };
}

function listRecentOrders(limit = 10) {
  const rows = db
    .prepare("SELECT * FROM commerce_orders ORDER BY created_at DESC LIMIT ?")
    .all(Math.min(limit, 50));
  return rows.map((r) => customerOrderBridge.mapCommerceOrder(r));
}

module.exports = {
  getLifecycleModel,
  getOrderLifecycleReadiness,
  listRecentOrders,
};
