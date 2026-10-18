/**
 * Item 214 — production deploy stays human-gated.
 * Presence-only inspect. Never calls a deploy hook or Render API.
 */

const AI_ACTORS = new Set(["pusat", "guardian", "orchestrator", "esat", "agent", "ai"]);

function inspect(env = process.env) {
  return {
    ok: true,
    live: false,
    deployed: false,
    mutated: false,
    hookCalled: false,
    secretsIncluded: false,
    hookUrlIncluded: false,
    deployHookPresent: Boolean(env.RENDER_DEPLOY_HOOK_URL),
    renderApiKeyPresent: Boolean(env.RENDER_API_KEY),
    note: "Presence-only. A configured hook is not a deploy. Item 214.",
  };
}

function trigger(input = {}, env = process.env) {
  const actor = String(input.actorId || input.actor || input.approver || "").trim().toLowerCase();
  const hookPresent = Boolean(env.RENDER_DEPLOY_HOOK_URL || input.hookUrl);
  if (AI_ACTORS.has(actor)) {
    return {
      ok: false,
      deployed: false,
      mutated: false,
      live: false,
      hookCalled: false,
      httpAttempted: false,
      secretsIncluded: false,
      hookUrlIncluded: false,
      reason: "SELF_APPROVE_DENIED",
      actor,
    };
  }
  return {
    ok: false,
    deployed: false,
    mutated: false,
    live: false,
    hookCalled: false,
    httpAttempted: false,
    secretsIncluded: false,
    hookUrlIncluded: false,
    forceDeployIgnored: input.forceDeploy === true,
    hookPresentIgnored: hookPresent,
    reason: "HUMAN_DEPLOY_REQUIRED",
    note: "Production deploy is not executed here. Item 214.",
  };
}

module.exports = { inspect, trigger };
