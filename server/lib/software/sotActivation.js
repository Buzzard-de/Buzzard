/**
 * Item 73 — Product SoT activation stays human-gated.
 * Env flag is not software activation. Dual-write stays forbidden.
 */

const { getEffectiveFlags } = require("../commerce/commerceFeatureFlags");
const { activationStatus } = require("../pim/productArchitecture");
const { isProductSourceOfTruthActive } = require("../pim/productWriteBoundary");

const AI_ACTORS = new Set(["pusat", "guardian", "orchestrator", "esat", "agent", "ai"]);

function status() {
  const flags = getEffectiveFlags();
  const architecture = activationStatus();
  return {
    ...architecture,
    productSourceOfTruthActive: false,
    activated: false,
    dualWrite: false,
    writeBoundaryActive: isProductSourceOfTruthActive() === true,
    productSotActive: flags.productSotActive,
    productSotEnvFlag: flags.productSotEnvFlag,
    envDoesNotActivate: true,
    humanApprovalRequired: true,
  };
}

function activate(input = {}) {
  const actor = String(input.actorId || input.actor || input.approver || "").trim().toLowerCase();
  const envFlagPresent = process.env.BUZZARD_PRODUCT_SOT_ACTIVE === "1" || input.envFlag === true;
  if (AI_ACTORS.has(actor)) {
    return {
      ok: false,
      activated: false,
      mutated: false,
      live: false,
      dualWrite: false,
      productSourceOfTruthActive: false,
      reason: "SELF_APPROVE_DENIED",
      actor,
    };
  }
  return {
    ok: false,
    activated: false,
    mutated: false,
    live: false,
    dualWrite: false,
    productSourceOfTruthActive: false,
    forceActivateIgnored: input.forceActivate === true,
    envFlagIgnored: envFlagPresent,
    reason: "HUMAN_SOT_ACTIVATION_REQUIRED",
    note: "Product SoT is not activated here. Dual-write stays forbidden. Item 73.",
  };
}

module.exports = { status, activate };
