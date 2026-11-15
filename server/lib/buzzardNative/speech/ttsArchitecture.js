const { protoSynth, quality, g2p } = require("./nativeTts");
const { analyzeOfficialVoice } = require("./voiceIdentity");

function architecture() {
  const voice = analyzeOfficialVoice({ actorId: "sinan_bey" });
  return {
    stages: ["text", "g2p", "duration", "source", "wav"],
    implemented: { g2p: true, protoTone: true, officialClone: false, neuralVocoder: false },
    cloneAuthorized: false,
    ttsReady: false,
    officialReference: voice.code,
    meanF0: voice.profile?.f0Hz?.mean ?? null,
    note: "Pipeline is ready for a future clone only after explicit human approval. Current output is proto tone.",
  };
}

function synthesizeSafe({ text, lang = "tr", actorId = "sinan_bey" } = {}) {
  const voice = analyzeOfficialVoice({ actorId });
  if (voice.profile?.cloneAuthorized) {
    return { ok: false, code: "CLONE_FLAG_TRUE_WITHOUT_ENGINE", cloneAuthorized: true };
  }
  const phon = g2p(text, lang);
  const proto = protoSynth({ text, lang });
  return {
    ok: true,
    ...proto,
    phonemes: phon.phonemes,
    quality: quality(),
    cloneAuthorized: false,
    officialVoiceUsed: false,
    wavValid: proto.bytes > 44,
  };
}

module.exports = { architecture, synthesizeSafe };
