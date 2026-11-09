const { protoSynth } = require("../speech/nativeTts");
const { getAgent } = require("./identityRegistry");
const { canUse } = require("./capabilityRegistry");

function speak({ agentId, text, lang = "tr" }) {
  const agent = getAgent(agentId);
  if (!agent) return { ok: false, code: "UNKNOWN_AGENT" };
  if (!canUse(agentId, "speech")) return { ok: false, code: "CAPABILITY_DENIED" };
  const proto = protoSynth({ text, lang });
  const official = agent.voice_profile.officialSinan === true;
  return {
    ok: true,
    agentId,
    voice_profile_id: agent.voice_profile.voice_profile_id,
    voiceStatus: agent.voice_profile.status,
    officialVoiceUsed: false,
    cloneAuthorized: false,
    mixedWithSinan: false,
    proto: official ? proto : { ...proto, hz: agentId === "sinan_bey" ? proto.hz : 190 },
    kind: official ? proto.kind : "PROTO_TONE_NOT_CHARACTER_VOICE",
  };
}

module.exports = { speak };
