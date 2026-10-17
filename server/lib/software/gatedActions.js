/**
 * Item 182 — catalog of high-impact actions.
 * Lists and refuses. Never executes sales, SoT, live pay, PO, listing, ship, deploy, send, or merge.
 */

const AI_ACTORS = new Set(["pusat", "guardian", "orchestrator", "esat", "agent", "ai"]);

const CATALOG = Object.freeze([
  { id: "sales_enable", item: 12, humanItem: 182, live: false },
  { id: "product_sot_activate", item: 73, humanItem: 182, live: false },
  { id: "live_payments_enable", item: 40, humanItem: 182, live: false },
  { id: "supplier_purchase_order", item: 87, humanItem: 182, live: false },
  { id: "marketplace_live_listing", item: 115, humanItem: 129, live: false },
  { id: "carrier_label_purchase", item: 22, humanItem: 182, live: false },
  { id: "customer_message_send", item: 155, humanItem: 165, live: false },
  { id: "production_deploy", item: 214, humanItem: 226, live: false },
  { id: "protected_branch_merge", item: 226, humanItem: 226, live: false },
]);

function catalog() {
  return CATALOG.map((row) => ({ ...row, executed: false, requiresHuman: true }));
}

function evaluate(input = {}) {
  const id = String(input.action || "").trim();
  const row = CATALOG.find((item) => item.id === id);
  if (!row) {
    return { ok: false, reason: "UNKNOWN_GATED_ACTION", executed: false, live: false };
  }
  const actor = String(input.actor || "").trim().toLowerCase();
  if (AI_ACTORS.has(actor)) {
    return {
      ok: false,
      reason: "SELF_APPROVE_DENIED",
      action: row.id,
      executed: false,
      live: false,
      requiresHuman: true,
      actor,
    };
  }
  return {
    ok: false,
    reason: "HUMAN_APPROVAL_REQUIRED",
    action: row.id,
    executed: false,
    live: false,
    requiresHuman: true,
    humanItem: row.humanItem,
  };
}

function execute(input = {}) {
  const decision = evaluate(input);
  return {
    ...decision,
    executed: false,
    sideEffect: false,
    note: "Catalog refusal only. No live action is started.",
  };
}

module.exports = { CATALOG, catalog, evaluate, execute };