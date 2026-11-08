/**
 * Official Sinan Bey voice identity. No invented F0. Missing reference stays missing.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const VOICE_ID = "sinan_bey_official_voice_v1";
const SEARCH_DIRS = [
  "public/council",
  "docs/council",
  "server/data",
  "uploads",
  "media",
];
const AUDIO_EXT = new Set([".wav", ".mp3", ".ogg", ".flac", ".m4a", ".aac", ".opus"]);

function findReference(root = process.cwd()) {
  const hits = [];
  for (const rel of SEARCH_DIRS) {
    const dir = path.join(root, rel);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (AUDIO_EXT.has(path.extname(name).toLowerCase())) hits.push(path.join(dir, name));
    }
  }
  return hits;
}

function emptyProfile({ reason }) {
  return {
    voiceId: VOICE_ID,
    profileVersion: 1,
    referenceFile: null,
    referenceFileHash: null,
    sampleRate: null,
    audioFormat: null,
    bitDepth: null,
    channels: null,
    durationSec: null,
    meanLevel: null,
    peakLevel: null,
    f0Hz: { min: null, max: null, mean: null, unit: "Hz" },
    pitchRangeHz: null,
    harmonics: null,
    formantsHz: null,
    jitter: null,
    shimmer: null,
    hnr: null,
    speakingRate: null,
    language: { tr: "target", de: "target", en: "target" },
    characterTarget: {
      deepMale: "TARGET_UNMEASURED",
      calm: "TARGET_UNMEASURED",
      professional: "TARGET_UNMEASURED",
    },
    analysisConfidence: 0,
    analysisTimestamp: new Date().toISOString(),
    permission: "WAITING_REFERENCE_AND_LICENSE",
    provenance: "none",
    cloneAuthorized: false,
    status: "BLOCKED",
    reason,
  };
}

function analyzeOfficialVoice({ actorId = "sinan_bey", root = process.cwd() } = {}) {
  if (!["sinan_bey", "pusat", "esat_bey"].includes(actorId)) {
    return { ok: false, code: "UNAUTHORIZED_ACTOR" };
  }
  const files = findReference(root);
  if (!files.length) {
    return {
      ok: false,
      code: "MISSING_REFERENCE_AUDIO",
      analyzed: false,
      inventedHz: false,
      profile: emptyProfile({ reason: "no_wav_mp3_or_other_audio_in_search_paths" }),
      searched: SEARCH_DIRS,
    };
  }
  const file = files[0];
  const buf = fs.readFileSync(file);
  const hash = crypto.createHash("sha256").update(buf).digest("hex");
  return {
    ok: true,
    analyzed: false,
    note: "File present but acoustic analysis pipeline is CODE_READY only in Phase 6.",
    profile: {
      ...emptyProfile({ reason: "file_found_analysis_not_run" }),
      referenceFile: file,
      referenceFileHash: hash,
      audioFormat: path.extname(file).slice(1),
      status: "CODE_READY",
    },
  };
}

function profilePath(root = process.cwd()) {
  return path.join(root, "docs/council/sinan_bey_official_voice_profile.json");
}

function writeProfile(profile, { actorId, root = process.cwd() } = {}) {
  if (!["sinan_bey", "pusat"].includes(actorId || "")) return { ok: false, code: "UNAUTHORIZED_ACTOR" };
  const p = profilePath(root);
  fs.writeFileSync(p, `${JSON.stringify(profile, null, 2)}\n`);
  return { ok: true, path: p, inventedHz: false };
}

module.exports = { VOICE_ID, findReference, analyzeOfficialVoice, writeProfile, profilePath, emptyProfile };
