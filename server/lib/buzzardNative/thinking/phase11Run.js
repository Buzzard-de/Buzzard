const { inspectFile, conditionTests } = require("../hearing/humanStt");
const { benchAll } = require("../speech/ttsBench");
const { verifyOfficialFile, cloneAttempt } = require("../speech/officialVoiceGuard");
const { analyzeOfficialVoice } = require("../speech/voiceIdentity");
const { probeHardware } = require("./hardwareProbe");
const { evaluateEgress } = require("../../security/egressPolicy");
const fs = require("fs");

function runPhase11({ actorId = "sinan_bey" } = {}) {
  if (!["sinan_bey", "pusat", "esat_bey"].includes(actorId)) return { ok: false, code: "UNAUTHORIZED_ACTOR" };
  const file = inspectFile("public/council/sinan-bey-official-voice-v1.m4a");
  const wav = inspectFile(require("../speech/wavTone").wavTone({ hz: 170.8, ms: 80 }));
  return {
    ok: true,
    liveVerified: false,
    budgetEur: 0,
    official: verifyOfficialFile(),
    voice: analyzeOfficialVoice({ actorId }),
    clone: cloneAttempt({ actorId, requested: true }),
    stt: {
      officialInspect: { format: file.format, transcribe: file.transcribe, humanStt: file.humanStt },
      wavInspect: { format: wav.format, durationSec: wav.durationSec },
      conditions: conditionTests(),
      humanStt: "NOT_IMPLEMENTED",
    },
    tts: benchAll(),
    egress: evaluateEgress({ destinationUrl: "https://api.openai.com/v1" }).allowed,
    hardware: probeHardware(),
    reportExists: fs.existsSync("docs/council/BUZZARD_NATIVE_AI_PHASE11_MASTER_REPORT.md"),
  };
}

module.exports = { runPhase11 };
