/**
 * Item 225 — first real customer order stays human-gated.
 * Drafts elsewhere remain drafts. This gate never creates a commercial order.
 */

const AI_ACTORS = new Set(["pusat", "guardian", "orchestrator", "esat", "agent", "ai"]);
const { isSalesEnabled } = require("../salesMode");

function inspect() {
  return {
    ok: true,
    live: false,
    commercial: false,
    commercialCreated: false,
    charged: false,
    fulfilled: false,
    salesEnabled: isSalesEnabled(),
    firstOrderPlaced: false,
    note: "Sales flag observed. No first real customer order. Item 225.",
  };
}

function place(input = {}) {
  const actor = String(input.actorId || input.actor || input.approver || "").trim().toLowerCase();
  if (AI_ACTORS.has(actor)) {
    return {
      ok: false,
      live: false,
      commercial: false,
      commercialCreated: false,
      charged: false,
      fulfilled: false,
      mutated: false,
      orderId: null,
      salesEnabled: isSalesEnabled(),
      reason: "SELF_APPROVE_DENIED",
      actor,
    };
  }
  return {
    ok: false,
    live: false,
    commercial: false,
    commercialCreated: false,
    charged: false,
    fulfilled: false,
    mutated: false,
    orderId: null,
    salesEnabled: isSalesEnabled(),
    forcePlaceIgnored: input.forcePlace === true,
    reason: "HUMAN_FIRST_ORDER_REQUIRED",
    note: "The first real customer order is not placed here. Item 225.",
  };
}

module.exports = { inspect, place };
