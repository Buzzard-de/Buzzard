const { getAgent } = require("./identityRegistry");
const { canUse } = require("./capabilityRegistry");

function bodyOf(agentId) {
  const agent = getAgent(agentId);
  if (!agent) return { ok: false, code: "UNKNOWN_AGENT" };
  if (!canUse(agentId, "digital_body")) {
    return { ok: false, code: "CAPABILITY_DENIED", agentId };
  }
  return {
    ok: true,
    agentId,
    avatar_profile_id: agent.avatar_profile.avatar_profile_id,
    avatarStatus: agent.avatar_profile.status,
    is3d: false,
    pngIsNotBody: true,
    visemeIsNotLipSync: true,
    motion: canUse(agentId, "motion") ? "CODE_READY" : "NOT_CONFIGURED",
    body3d: "NOT_IMPLEMENTED",
    lipSync: "NOT_IMPLEMENTED",
    liveVerified: false,
  };
}

function mixAvatars(fromId, toId) {
  if (fromId !== toId) return { ok: false, code: "AVATAR_CROSS_IDENTITY_DENIED" };
  return { ok: false, code: "HUMAN_GATE_REQUIRED" };
}

module.exports = { bodyOf, mixAvatars };
