/**
 * Official-voice gate. Cloning stays closed until a license says otherwise.
 * No engine here writes the reference file or assigns it to another profile.
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { VOICE_ID, OFFICIAL_REL, analyzeOfficialVoice } = require("./voiceIdentity");
const { EXPECTED_SHA } = require("./officialVoiceGuard");

function inspectReference(root = process.cwd()) {
  const file = path.join(root, OFFICIAL_REL);
  if (!fs.existsSync(file)) {
    return { ok: false, code: "MISSING_REFERENCE_AUDIO", voiceId: VOICE_ID, ttsReady: false, cloneAuthorized: false, unchanged: true };
  }
  const before = fs.readFileSync(file);
  const hashMatches = crypto.createHash("sha256").update(before).digest("hex") === EXPECTED_SHA;
  let probe = null;
  try {
    probe = JSON.parse(execFileSync("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration,format_name,size:stream=codec_name,sample_rate,channels",
      "-of", "json",
      file,
    ], { encoding: "utf8" }));
  } catch {
    probe = null;
  }
  const after = fs.readFileSync(file);
  const stream = probe?.streams?.[0] || {};
  const voice = analyzeOfficialVoice({ actorId: "sinan_bey", root });
  return {
    ok: hashMatches && before.equals(after),
    code: hashMatches ? "REFERENCE_REGISTERED" : "REFERENCE_HASH_MISMATCH",
    voiceId: VOICE_ID,
    hashMatches,
    unchanged: before.equals(after),
    bytes: before.length,
    playable: stream.codec_name === "aac",
    container: probe ? {
      format: probe.format?.format_name || null,
      codec: stream.codec_name || null,
      sampleRateHz: Number(stream.sample_rate) || null,
      channels: Number(stream.channels) || null,
      durationSec: Number(probe.format?.duration) || null,
    } : null,
    cloneAuthorized: voice.profile?.cloneAuthorized === true,
    ttsReady: false,
    officialVoiceUsed: false,
  };
}

function synthesize({ agentId, voiceId } = {}) {
  const official = voiceId === VOICE_ID || agentId === "sinan_bey";
  if (official) {
    const voice = analyzeOfficialVoice({ actorId: "sinan_bey" });
    if (voice.profile?.cloneAuthorized !== true) {
      return {
        ok: false,
        code: "CLONE_DENIED",
        ttsReady: false,
        bytes: 0,
        audio: false,
        officialVoiceUsed: false,
        clone: false,
        provider: null,
        voiceId: VOICE_ID,
      };
    }
    return { ok: false, code: "PROVIDER_ABSENT", ttsReady: false, bytes: 0, audio: false, officialVoiceUsed: false, clone: false, provider: null, voiceId: VOICE_ID };
  }
  return {
    ok: false,
    code: "VOICE_REFERENCE_ABSENT",
    ttsReady: false,
    bytes: 0,
    audio: false,
    officialVoiceUsed: false,
    clone: false,
    provider: null,
    voiceId: voiceId || null,
  };
}

module.exports = { inspectReference, synthesize };
