const { runPhase12Eval } = require("./phase12Eval");
const { verifyOfficialFile } = require("../speech/officialVoiceGuard");
const { evaluateEgress } = require("../../security/egressPolicy");
const { probeHardware } = require("./hardwareProbe");

function runPhase12({ actorId = "sinan_bey" } = {}) {
  if (!["sinan_bey", "pusat", "esat_bey"].includes(actorId)) return { ok: false, code: "UNAUTHORIZED_ACTOR" };
  return {
    ok: true,
    budgetEur: 0,
    liveVerified: false,
    eval: runPhase12Eval(),
    official: verifyOfficialFile(),
    egress: evaluateEgress({ destinationUrl: "https://api.anthropic.com/v1" }).allowed,
    hardware: probeHardware(),
  };
}

module.exports = { runPhase12 };
