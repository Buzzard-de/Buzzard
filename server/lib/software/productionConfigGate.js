/**
 * Item 213 — production environment configuration stays human-gated.
 * Inspects presence only. Never mutates process.env or a production host.
 */

const AI_ACTORS = new Set(["pusat", "guardian", "orchestrator", "esat", "agent", "ai"]);

const PROTECTED_KEYS = Object.freeze([
  "BUZZARD_SALES_ENABLED",
  "BUZZARD_LIVE_PAYMENTS",
  "BUZZARD_PRODUCT_SOT_ACTIVE",
  "JWT_SECRET",
  "AUTH_SECRET",
  "STRIPE_SECRET_KEY",
  "PAYPAL_CLIENT_SECRET",
  "BUZZARD_DB_PATH",
]);

function inspect(env = process.env) {
  return {
    ok: true,
    live: false,
    productionChanged: false,
    mutated: false,
    secretsIncluded: false,
    keys: PROTECTED_KEYS.map((name) => ({
      name,
      present: Boolean(env[name]),
      valueIncluded: false,
    })),
    note: "Presence-only inspection. No production env write. Item 213.",
  };
}

function apply(input = {}) {
  const actor = String(input.actorId || input.actor || input.approver || "").trim().toLowerCase();
  const updates = input.updates && typeof input.updates === "object" ? input.updates : {};
  const attemptedKeys = Object.keys(updates);
  if (AI_ACTORS.has(actor)) {
    return {
      ok: false,
      applied: false,
      mutated: false,
      live: false,
      productionChanged: false,
      processEnvMutated: false,
      secretsIncluded: false,
      attemptedKeys,
      reason: "SELF_APPROVE_DENIED",
      actor,
    };
  }
  return {
    ok: false,
    applied: false,
    mutated: false,
    live: false,
    productionChanged: false,
    processEnvMutated: false,
    secretsIncluded: false,
    forceApplyIgnored: input.forceApply === true,
    attemptedKeys,
    reason: "HUMAN_PRODUCTION_CONFIG_REQUIRED",
    note: "Production environment keys are not written here. Item 213.",
  };
}

module.exports = { PROTECTED_KEYS, inspect, apply };
