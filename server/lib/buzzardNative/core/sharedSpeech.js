const { protoSynth } = require("../speech/nativeTts");
const { getAgent } = require("./identityRegistry");
const { canUse } = require("./capabilityRegistry");

function speak({ agentId, text, lang = "tr" }) {
  const agent = getAgent(agentId);
  if (!agent) return { ok: false, code: "UNKNOWN_AGENT" };
  if (!canUse(agentId, "speech")) return { ok: false, code: "CAPABILITY_DENIED" };
  const profile = agent.voice_profile || {};
  const official = profile.officialSinan === true && profile.status === "REFERENCE_REGISTERED";
  if (!official) {
    return {
      ok: false,
      code: "VOICE_NOT_CONFIGURED",
      agentId,
      voice_profile_id: profile.voice_profile_id || null,
      voiceStatus: profile.status || "NOT_CONFIGURED",
      officialVoiceUsed: false,
      cloneAuthorized: false,
      mixedWithSinan: false,
      live: false,
      ready: false,
      ttsReady: false,
      serviceConnected: false,
      audioProduced: false,
    };
  }
  const proto = protoSynth({ text, lang });
  return {
    ok: proto.ok === true,
    code: proto.ok === true ? "LOCAL_PROTO_NOT_SERVICE" : "MEASURED_F0_ABSENT",
    agentId,
    voice_profile_id: profile.voice_profile_id,
    voiceStatus: profile.status,
    officialVoiceUsed: false,
    cloneAuthorized: false,
    mixedWithSinan: false,
    proto,
    kind: proto.kind,
    live: false,
    ready: false,
    ttsReady: false,
    serviceConnected: false,
    codePresent: true,
  };
}

module.exports = { speak };
