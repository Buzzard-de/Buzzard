const { getFlags } = require("../flags");
const { redactObject } = require("../securityGuard");
const cost = require("../costControl");

function configured() {
  return Boolean(process.env.AVATAR_PROVIDER && (process.env.AVATAR_API_KEY || process.env.READY_PLAYER_ME_KEY));
}

function health() {
  const flags = getFlags();
  if (!flags.AVATAR_ENABLED && !flags.EMBODIED_AI_ENABLED) {
    return redactObject({
      ok: false,
      code: "AVATAR_DISABLED",
      configured: configured(),
      wired: false,
      live: false,
      status: "DISABLED",
    });
  }
  if (!configured()) {
    return redactObject({
      ok: false,
      code: "AVATAR_PROVIDER_NOT_CONFIGURED",
      configured: false,
      wired: false,
      live: false,
      status: "NOT_CONFIGURED",
    });
  }
  return redactObject({
    ok: false,
    code: "AVATAR_PROVIDER_NOT_WIRED",
    configured: true,
    wired: false,
    live: false,
    status: "NOT_WIRED",
    provider: process.env.AVATAR_PROVIDER,
  });
}

function createAvatarSession() {
  const h = health();
  if (!h.ok) return { ...h, session: null, fakeLiveVideo: false };
  return { ok: false, code: "AVATAR_PROVIDER_NOT_WIRED", fakeLiveVideo: false };
}

function startStream() {
  return { ok: false, code: health().code || "AVATAR_PROVIDER_NOT_CONFIGURED", live: false };
}

function stopStream() {
  return { ok: true, stopped: true, live: false };
}

function setExpression() {
  return { ok: false, code: health().code, live: false };
}

function setAnimation() {
  return { ok: false, code: health().code, live: false };
}

function setCamera() {
  return { ok: false, code: health().code, live: false };
}

function setEnvironment() {
  return { ok: false, code: health().code, live: false };
}

function destroySession() {
  return { ok: true, destroyed: true };
}

function estimateCost() {
  const est = configured() ? 0.08 : 0;
  if (est) cost.recordUsage({ kind: "avatar", provider: process.env.AVATAR_PROVIDER, estimatedCost: est });
  return { costEstimate: est, costActual: null };
}

module.exports = {
  health,
  createAvatarSession,
  startStream,
  stopStream,
  setExpression,
  setAnimation,
  setCamera,
  setEnvironment,
  destroySession,
  estimateCost,
};
