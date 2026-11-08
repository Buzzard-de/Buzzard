const { createEngine, notImplemented } = require("../engineContract");
const { g2p, protoSynth, quality } = require("../speech/nativeTts");
const { analyzeOfficialVoice, VOICE_ID } = require("../speech/voiceIdentity");
const { wavTone } = require("../speech/wavTone");

const VOICES = Object.freeze({
  sinan_bey: { character: "serious_calm_professional_male", live: false },
  pusat: { character: "coordinator_neutral", live: false },
  esat_bey: { character: "security_reserved_male", live: false },
  dogu_bey: { character: "research_measured_male", live: false },
});

function createSpeechEngine() {
  return createEngine({
    id: "speech",
    capabilities: ["voice_identity", "test_tone", "phoneme_plan"],
    executeImpl(input) {
      const op = input.op || "identity";
      if (op === "identity") {
        const id = input.memberId || "sinan_bey";
        return { op, voice: VOICES[id] || null, known: Boolean(VOICES[id]), liveTts: false };
      }
      if (op === "test_tone") {
        const wav = wavTone(input);
        return { op, kind: "TEST_TONE_NOT_TTS", bytes: wav.length, naturalHumanClaim: false };
      }
      if (op === "dataset") {
        return { op, voiceHours: 0, sinanTarget: VOICES.sinan_bey, note: "no_vendor_voice_purchase", liveTts: false };
      }
      if (op === "g2p") return { op, ...g2p(input.text, input.lang), liveTts: false };
      if (op === "proto_synth") return { op, ...protoSynth(input), liveTts: false };
      if (op === "quality") return { op, ...quality(), liveTts: false };
      if (op === "official_analyze") return { op, ...analyzeOfficialVoice(input) };
      if (op === "measured_f0") {
        const a = analyzeOfficialVoice(input);
        return { op, hz: a.profile?.f0Hz?.mean ?? null, unit: "Hz", inventedHz: false, clone: false, ttsReady: false };
      }
      if (op === "synthesize") {
        return { ...notImplemented("synthesize"), liveTts: false, officialVoice: false, voiceId: VOICE_ID };
      }
      return notImplemented(op);
    },
  });
}

module.exports = { createSpeechEngine, VOICES, wavTone };
