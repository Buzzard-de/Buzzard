/**
 * Coordinated think -> security -> proto speech. Not a live meeting.
 */
const { evaluateEgress } = require("../../security/egressPolicy");
const { protoSynth, quality } = require("./nativeTts");

function thinkSpeak({ thinking, text, actorId = "sinan_bey" }) {
  const egress = evaluateEgress({ destinationUrl: "https://api.openai.com/v1", payload: { memory: true } });
  if (egress.allowed) return { ok: false, code: "EGRESS_POLICY_BROKEN" };
  const think = thinking.execute({ op: "plan", goal: text || "report.status" });
  const speech = protoSynth({ text: (think.steps || []).join(" ") || String(text || ""), lang: "tr" });
  return {
    ok: true,
    actorId,
    think,
    speech: { ...speech, quality: quality() },
    liveMeeting: false,
    officialVoice: false,
    thinkingQuality: "tiny_or_rules_not_concealed",
    audit: { egressDenied: true, esatSoleDefense: false },
  };
}

module.exports = { thinkSpeak };
