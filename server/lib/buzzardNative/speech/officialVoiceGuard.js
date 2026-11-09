const crypto = require("crypto");
const fs = require("fs");
const { analyzeOfficialVoice, OFFICIAL_REL } = require("./voiceIdentity");

const EXPECTED_SHA = "16d43e7d8b27a6520ee9e6bbc61e8c503bdc76f7b715fa4ad2b356a558df0e2d";

function verifyOfficialFile(root = process.cwd()) {
  const p = require("path").join(root, OFFICIAL_REL);
  if (!fs.existsSync(p)) return { ok: false, code: "MISSING_REFERENCE_AUDIO" };
  const sha256 = crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
  return {
    ok: sha256 === EXPECTED_SHA,
    sha256,
    expected: EXPECTED_SHA,
    unchanged: sha256 === EXPECTED_SHA,
  };
}

function cloneAttempt({ actorId = "sinan_bey", requested = true } = {}) {
  const voice = analyzeOfficialVoice({ actorId });
  if (voice.code === "UNAUTHORIZED_ACTOR") return voice;
  if (requested && !voice.profile.cloneAuthorized) {
    return {
      ok: false,
      code: "CLONE_DENIED",
      cloneAuthorized: false,
      trained: false,
      officialVoiceUsed: false,
    };
  }
  return { ok: false, code: "CLONE_ENGINE_ABSENT", cloneAuthorized: voice.profile.cloneAuthorized };
}

module.exports = { verifyOfficialFile, cloneAttempt, EXPECTED_SHA };
