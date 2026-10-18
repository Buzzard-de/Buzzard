/**
 * Item 219 — go-live approval execution stays human-gated.
 * Does not call commerce.approveGoLive and does not enable sales.
 */

const AI_ACTORS = new Set(["pusat", "guardian", "orchestrator", "esat", "agent", "ai"]);
const { PRODUCTION_SAFETY_LOCK } = require("../commerce/goLiveApproval");

function approve(input = {}) {
  const actor = String(input.actorId || input.actor || input.approver || input.decidedBy || "").trim().toLowerCase();
  if (AI_ACTORS.has(actor)) {
    return {
      ok: false,
      executed: false,
      approved: false,
      live: false,
      salesEnabled: false,
      mutated: false,
      productionSafetyLock: PRODUCTION_SAFETY_LOCK,
      reason: "SELF_APPROVE_DENIED",
      actor,
    };
  }
  return {
    ok: false,
    executed: false,
    approved: false,
    live: false,
    salesEnabled: false,
    mutated: false,
    productionSafetyLock: PRODUCTION_SAFETY_LOCK,
    forceApproveIgnored: input.forceApprove === true,
    reason: "HUMAN_GO_LIVE_REQUIRED",
    note: "Go-live approval is not executed here. Sales stay locked. Item 219.",
  };
}

function activateSales(input = {}) {
  const decision = approve(input);
  return {
    ...decision,
    allowed: false,
    salesEnabled: false,
    reason: decision.reason === "SELF_APPROVE_DENIED" ? decision.reason : "HUMAN_SALES_ACTIVATION_REQUIRED",
    note: "Sales activation is not executed from the go-live software gate. Item 219.",
  };
}

module.exports = { approve, activateSales };
