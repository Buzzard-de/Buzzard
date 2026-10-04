"use strict";

/**
 * Buzzard-owned order facade. Canonical store is commerce_orders via Order SoT.
 * orders.json is legacy/read-only and is not used here.
 */
const { createOrderSot } = require("./sot/orderSot");
const { ACTORS } = require("./sot/sourceOfTruthRegistry");

function createCanonicalOrderFacade(options = {}) {
  const env = options.env || process.env;
  const orderService = options.orderService || require("./commerce/orderService");
  const sot = options.orderSot || createOrderSot({ env, orderService, logAudit: options.logAudit || (() => {}) });

  function getOrder(orderId) {
    const fromService = orderService.getOrder ? orderService.getOrder(orderId, {}) : null;
    if (fromService && !fromService.error && !fromService.blocked) {
      return { ok: true, source: "commerce_orders", store: "canonical_oms", order: fromService };
    }
    const { db } = require("./db");
    const row = db.prepare("SELECT id, status, order_type FROM commerce_orders WHERE id = ?").get(orderId);
    if (row) {
      return {
        ok: true,
        source: "commerce_orders",
        store: "canonical_oms",
        order: { id: row.id, status: row.status, orderType: row.order_type },
      };
    }
    return { ok: false, code: "NOT_FOUND", store: "canonical_oms", source: "commerce_orders" };
  }

  function createOrder(input = {}) {
    return sot.createOrder({
      ...input,
      actor: input.actor || ACTORS.ORDER_ENGINE,
    });
  }

  function cancelOrder(input = {}) {
    return sot.cancelOrder({
      ...input,
      actor: input.actor || ACTORS.ORDER_ENGINE,
    });
  }

  function usesLegacyJson() {
    return false;
  }

  return Object.freeze({
    getOrder,
    createOrder,
    cancelOrder,
    reserveOrder: (input) => sot.reserveOrder({ ...input, actor: input.actor || ACTORS.ORDER_ENGINE }),
    usesLegacyJson,
    store: "commerce_orders",
  });
}

module.exports = { createCanonicalOrderFacade };
