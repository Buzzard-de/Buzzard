const { runE2E, resilience } = require("../platform/phase18E2E");
const { matrix } = require("../platform/engineStatus");
const { probeHardware } = require("./hardwareProbe");
const { verifyOfficialFile } = require("../speech/officialVoiceGuard");
const { benchAll } = require("../speech/ttsBench");
const { runPhase12Eval } = require("./phase12Eval");

function runPhase18({ actorId = "sinan_bey" } = {}) {
  if (!["sinan_bey", "pusat", "esat_bey"].includes(actorId)) return { ok: false, code: "UNAUTHORIZED_ACTOR" };
  const t0 = process.hrtime.bigint();
  const e2e = runE2E();
  const e2eMs = Number(process.hrtime.bigint() - t0) / 1e6;
  const tts = benchAll();
  return {
    ok: true,
    budgetEur: 0,
    liveVerified: false,
    productionReady: false,
    singlePercentComplete: null,
    e2e,
    e2eMs,
    resilience: resilience(),
    engines: matrix(),
    thinking: runPhase12Eval(),
    ttsLatencyMs: tts.meanLatencyMs,
    official: verifyOfficialFile(),
    hardware: probeHardware(),
  };
}

module.exports = { runPhase18 };
