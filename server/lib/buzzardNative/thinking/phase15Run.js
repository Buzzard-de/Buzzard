const { duplexOnce, measureLoss } = require("../realtime/duplex");
const { createSessionHub } = require("../realtime/nativeSession");
const { verifyOfficialFile } = require("../speech/officialVoiceGuard");
const { evaluateEgress } = require("../../security/egressPolicy");

function runPhase15({ actorId = "sinan_bey" } = {}) {
  if (!["sinan_bey", "pusat", "esat_bey"].includes(actorId)) return { ok: false, code: "UNAUTHORIZED_ACTOR" };
  const hub = createSessionHub();
  return {
    ok: true,
    budgetEur: 0,
    liveVerified: false,
    duplex: duplexOnce(),
    loss: measureLoss(12, 0.15),
    unauth: hub.open({ actorId: "stranger" }).code,
    liveMedia: "BLOCKED",
    official: verifyOfficialFile(),
    egress: evaluateEgress({ destinationUrl: "https://api.openai.com/v1" }).allowed,
  };
}

module.exports = { runPhase15 };
