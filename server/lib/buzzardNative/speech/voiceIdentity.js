/**
 * Official Sinan Bey voice identity. No invented F0.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const VOICE_ID = "sinan_bey_official_voice_v1";
const OFFICIAL_REL = "public/council/sinan-bey-official-voice-v1.m4a";
const ANALYSIS_REL = "docs/council/sinan_bey_official_voice_analysis.json";
const SEARCH_DIRS = ["public/council", "docs/council", "server/data", "uploads", "media"];
const AUDIO_EXT = new Set([".wav", ".mp3", ".ogg", ".flac", ".m4a", ".aac", ".opus"]);

function findReference(root = process.cwd()) {
  const official = path.join(root, OFFICIAL_REL);
  if (fs.existsSync(official)) return [official];
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
    profileVersion: 2,
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
    ttsReady: false,
    status: "BLOCKED",
    reason,
  };
}

function loadSidecar(root) {
  const p = path.join(root, ANALYSIS_REL);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
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
      ttsReady: false,
      profile: emptyProfile({ reason: "no_wav_mp3_or_other_audio_in_search_paths" }),
      searched: SEARCH_DIRS,
    };
  }
  const file = files[0];
  const buf = fs.readFileSync(file);
  const hash = crypto.createHash("sha256").update(buf).digest("hex");
  const side = loadSidecar(root);
  const hashMatch = Boolean(side && side.referenceSha256 === hash);
  const f0 = hashMatch && side.f0Hz ? side.f0Hz : { min: null, max: null, mean: null, unit: "Hz" };
  const profile = {
    ...emptyProfile({ reason: hashMatch ? "reference_measured" : "reference_present_sidecar_mismatch" }),
    profileVersion: 2,
    referenceFile: path.relative(root, file).replace(/\\/g, "/"),
    referenceFileHash: hash,
    sampleRate: hashMatch ? side.container.sampleRateHz : null,
    audioFormat: path.extname(file).slice(1),
    bitDepth: hashMatch ? side.container.bitDepth : null,
    channels: hashMatch ? side.container.channels : null,
    durationSec: hashMatch ? side.container.durationSec : null,
    meanLevel: hashMatch ? side.pcmPreview.rms : null,
    peakLevel: hashMatch ? side.pcmPreview.peak : null,
    f0Hz: { min: f0.min, max: f0.max, mean: f0.mean, unit: "Hz", reliability: f0.reliability || null },
    formantsHz: hashMatch ? side.formantsHz : null,
    pitchRangeHz: f0.min != null && f0.max != null ? [f0.min, f0.max] : null,
    analysisConfidence: hashMatch ? 0.6 : 0.2,
    permission: "SULEYMAN_DESIGNATED_REFERENCE",
    provenance: "user_upload_Yeni_Kayit_3.m4a",
    cloneAuthorized: false,
    ttsReady: false,
    status: hashMatch ? "REFERENCE_REGISTERED" : "CODE_READY",
    characterTarget: {
      deepMale: "TARGET_NOT_CONFIRMED_MEAN_F0_ABOUT_171HZ",
      calm: "TARGET_UNMEASURED",
      professional: "TARGET_UNMEASURED",
    },
  };
  return {
    ok: true,
    code: "REFERENCE_REGISTERED",
    analyzed: hashMatch,
    inventedHz: false,
    ttsReady: false,
    officialVoiceUsed: false,
    profile,
  };
}

function profilePath(root = process.cwd()) {
  return path.join(root, "docs/council/sinan_bey_official_voice_profile.json");
}

function writeProfile(profile, { actorId, root = process.cwd() } = {}) {
  if (!["sinan_bey", "pusat"].includes(actorId || "")) return { ok: false, code: "UNAUTHORIZED_ACTOR" };
  const locked = { ...profile, cloneAuthorized: false, ttsReady: false };
  const p = profilePath(root);
  fs.mkdirSync(require("path").dirname(p), { recursive: true });
  fs.writeFileSync(p, `${JSON.stringify(locked, null, 2)}\n`);
  return { ok: true, path: p, inventedHz: false, cloneAuthorized: false };
}

module.exports = {
  VOICE_ID,
  OFFICIAL_REL,
  findReference,
  analyzeOfficialVoice,
  writeProfile,
  profilePath,
  emptyProfile,
};
