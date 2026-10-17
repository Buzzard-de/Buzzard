/**
 * Item 67 — PIM live customer publish stays human-gated.
 * Catalog dry-run is allowed. This module never mutates storefront visibility.
 */

const catalogPublish = require("../pim/productCatalogPublish");

const AI_ACTORS = new Set(["pusat", "guardian", "orchestrator", "esat", "agent", "ai", "pim-publish"]);

function livePublish(input = {}) {
  const actor = String(input.actorId || input.actor || "").trim().toLowerCase();
  if (AI_ACTORS.has(actor)) {
    return {
      ok: false,
      success: false,
      mutated: false,
      live: false,
      published: false,
      salesEnabled: false,
      reason: "SELF_APPROVE_DENIED",
      sku: input.sku || null,
    };
  }
  return {
    ok: false,
    success: false,
    mutated: false,
    live: false,
    published: false,
    forceLiveIgnored: input.forceLive === true,
    salesWouldChange: false,
    reason: "HUMAN_PUBLISH_REQUIRED",
    sku: input.sku || null,
    note: "Live customer-facing PIM publish is not executed here. Item 67.",
  };
}

function dryRun(sku) {
  const catalog = catalogPublish.publishDryRun(sku);
  return {
    ...catalog,
    live: false,
    mutated: false,
    salesWouldChange: false,
    liveCustomerPublish: false,
  };
}

module.exports = { livePublish, dryRun };