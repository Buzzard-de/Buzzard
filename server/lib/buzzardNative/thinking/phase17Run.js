const { denyGate, meeting, ROLES } = require("../platform/councilOps");
const { verifyOfficialFile } = require("../speech/officialVoiceGuard");
const { evaluateEgress } = require("../../security/egressPolicy");

function runPhase17({ actorId = "sinan_bey" } = {}) {
  if (!["sinan_bey", "pusat", "esat_bey"].includes(actorId)) return { ok: false, code: "UNAUTHORIZED_ACTOR" };
  return {
    ok: true,
    budgetEur: 0,
    liveVerified: false,
    roles: ROLES,
    meeting: meeting({ present: ["pusat", "sinan_bey", "esat_bey"] }),
    missingDogu: true,
    push: denyGate("GIT_PUSH", "sinan_bey"),
    deploy: denyGate("DEPLOY", "sinan_bey"),
    clone: denyGate("LOOSEN_SECURITY", "sinan_bey"),
    official: verifyOfficialFile(),
    egress: evaluateEgress({ destinationUrl: "https://api.openai.com/v1" }).allowed,
  };
}

module.exports = { runPhase17 };
