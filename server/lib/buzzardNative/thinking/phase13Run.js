const { ocrLanguages, compare, videoFrames } = require("../vision/imageOps");
const { renderTextPng } = require("../vision/bitmapFont");
const { syntheticTwoBlobs } = require("../vision/blobDetect");
const { verifyOfficialFile } = require("../speech/officialVoiceGuard");
const { evaluateEgress } = require("../../security/egressPolicy");

function runPhase13({ actorId = "sinan_bey" } = {}) {
  if (!["sinan_bey", "pusat", "esat_bey"].includes(actorId)) return { ok: false, code: "UNAUTHORIZED_ACTOR" };
  const a = renderTextPng("SINAN").png;
  const b = renderTextPng("SINAN").png;
  const c = renderTextPng("HELP").png;
  return {
    ok: true,
    budgetEur: 0,
    liveVerified: false,
    ocr: ocrLanguages(),
    compareSame: compare(a, b).same,
    compareDiff: compare(a, c).same === false,
    blobs: syntheticTwoBlobs().count,
    video: videoFrames([a, a, c]),
    understand: "NOT_IMPLEMENTED",
    official: verifyOfficialFile(),
    egress: evaluateEgress({ destinationUrl: "https://api.openai.com/v1" }).allowed,
  };
}

module.exports = { runPhase13 };
