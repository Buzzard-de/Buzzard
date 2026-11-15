const { setExpression, idleTick, speechSync } = require("../motion/expression");
const { verifyOfficialFile } = require("../speech/officialVoiceGuard");
const fs = require("fs");

function runPhase14({ actorId = "sinan_bey" } = {}) {
  if (!["sinan_bey", "pusat", "esat_bey"].includes(actorId)) return { ok: false, code: "UNAUTHORIZED_ACTOR" };
  return {
    ok: true,
    budgetEur: 0,
    liveVerified: false,
    avatarExists: fs.existsSync("public/council/sinan-bey.png"),
    body3d: false,
    expressions: ["neutral", "listening", "thinking", "speaking"].map((e) => setExpression(e).ok),
    idle: idleTick(),
    sync: speechSync("merhaba", "tr"),
    official: verifyOfficialFile(),
  };
}

module.exports = { runPhase14 };
