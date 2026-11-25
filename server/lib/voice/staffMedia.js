/**
 * Local council audio. Tone-codec WAV in, tone-codec WAV out.
 * Sinan's reference file is never copied onto another profile.
 * OpenAI, Twilio, and STUN stay closed unless a caller injects a transport.
 */
const crypto = require("crypto");
const fs = require("fs");
const { VOICE_ID } = require("../buzzardNative/speech/voiceIdentity");
const { g2p } = require("../buzzardNative/speech/nativeTts");
const { encodePhonemes, decodeWav } = require("../buzzardNative/hearing/toneCodec");
const { getAgent, ids } = require("../buzzardNative/core/identityRegistry");
const { canUse } = require("../buzzardNative/core/capabilityRegistry");
const { alignToAudio } = require("../buzzardNative/motion/visemeSchedule");
const { isSalesEnabled } = require("../salesMode");

const LANGS = new Set(["tr", "de", "en"]);
const history = [];
const PHRASES = Object.freeze({
  fiyat: "price",
  stok: "stock",
  güvenlik: "security",
  hukuk: "tax",
});

function profileFor(agentId) {
  const agent = getAgent(agentId);
  if (!agent) return { ok: false, code: "UNKNOWN_AGENT" };
  const own = agent.voice_profile.voice_profile_id;
  const official = agentId === "sinan_bey";
  return {
    ok: true,
    agentId,
    voiceId: official ? VOICE_ID : own,
    official,
    officialVoiceUsed: false,
    cloneAuthorized: false,
    speech: canUse(agentId, "speech"),
    gain: 0.45 + (crypto.createHash("sha256").update(agentId).digest()[0] % 5) * 0.08,
  };
}

function scaleWav(wav, gain) {
  const out = Buffer.from(wav);
  for (let i = 44; i < out.length; i += 1) {
    const centered = out[i] - 128;
    out[i] = Math.max(0, Math.min(255, Math.round(128 + centered * gain)));
  }
  return out;
}

function synthesizeStaff({ agentId, text = "", lang = "tr" } = {}) {
  const profile = profileFor(agentId);
  if (!profile.ok) return { ...profile, audio: false, bytes: 0 };
  if (!LANGS.has(lang)) return { ok: false, code: "LANGUAGE_UNSUPPORTED", audio: false, bytes: 0, lang };
  if (!profile.speech) return { ok: false, code: "CAPABILITY_DENIED", audio: false, bytes: 0, voiceId: profile.voiceId };
  const clean = String(text || "").trim();
  if (!clean) return { ok: false, code: "EMPTY_TEXT", audio: false, bytes: 0 };
  if (clean.length > 180) return { ok: false, code: "TTS_INPUT_TOO_LONG", audio: false, bytes: 0 };
  const phonemes = g2p(clean, lang).phonemes.filter(Boolean).slice(0, 16);
  const wav = scaleWav(encodePhonemes(phonemes), profile.gain);
  const frames = [];
  for (let i = 44; i < wav.length; i += 320) frames.push(wav.subarray(i, Math.min(wav.length, i + 320)));
  return {
    ok: true,
    audio: true,
    bytes: wav.length,
    wav,
    frames,
    phonemes,
    lang,
    voiceId: profile.voiceId,
    officialVoiceUsed: false,
    clone: false,
    neural: false,
    provider: "local_tone_codec",
    liveTts: false,
  };
}

function transcribeStaff({ audio = null, lang = "tr", timeoutMs = 1000, file = null } = {}) {
  if (timeoutMs === 0) return { ok: false, code: "STT_TIMEOUT", transcript: null, generalStt: false };
  let buf = Buffer.isBuffer(audio) ? audio : null;
  if (file) {
    if (!fs.existsSync(file)) return { ok: false, code: "AUDIO_FILE_MISSING", transcript: null, generalStt: false };
    buf = fs.readFileSync(file);
  }
  if (!buf || buf.length === 0) return { ok: false, code: "EMPTY_AUDIO", transcript: null, generalStt: false };
  if (buf.length > 1_500_000) return { ok: false, code: "AUDIO_TOO_LARGE", transcript: null, generalStt: false };
  if (!LANGS.has(lang)) return { ok: false, code: "LANGUAGE_UNSUPPORTED", transcript: null, generalStt: false };
  const decoded = decodeWav(buf);
  if (!decoded.ok) return { ok: false, code: decoded.code || "UNSUPPORTED_OR_CORRUPT_AUDIO", transcript: null, generalStt: false };
  const phonemes = decoded.phonemes.filter((phone) => phone !== "?");
  return {
    ok: phonemes.length > 0,
    code: phonemes.length ? "TONE_DECODED" : "NO_VOICED_FRAMES",
    phonemes,
    transcript: phonemes.join(""),
    orthographyRecovered: false,
    lang,
    pcmBytes: Math.max(0, buf.length - 44),
    generalStt: false,
    provider: "local_tone_codec",
    liveStt: false,
  };
}

function remember(row) {
  history.push({ ...row, at: new Date().toISOString() });
  if (history.length > 50) history.shift();
}

function phraseDomain(phonemes) {
  const got = phonemes.join("");
  for (const [word, domain] of Object.entries(PHRASES)) {
    const expected = g2p(word, "tr").phonemes.filter(Boolean).join("");
    if (got === expected) return domain;
  }
  return null;
}

function voiceRequest({ actorId = "pusat", agentId, audio, lang = "tr", dbPath } = {}) {
  if (actorId !== "pusat") return { ok: false, code: "ORCHESTRATOR_REQUIRED", live: false, salesEnabled: isSalesEnabled() };
  const heard = transcribeStaff({ audio, lang });
  if (!heard.ok) return { ...heard, routed: false, salesEnabled: isSalesEnabled() };
  const domain = phraseDomain(heard.phonemes) || "coordination";
  const profile = profileFor(agentId || "pusat");
  let task = null;
  if (dbPath && domain !== "coordination") {
    const { createOrchestrator } = require("../pusat/orchestrator");
    const orch = createOrchestrator({ dbPath });
    task = orch.routeStaff({ domain });
    orch.close();
  }
  remember({ agentId: profile.agentId, voiceId: profile.voiceId, domain, bytes: audio ? audio.length : 0, phonemes: heard.phonemes.length });
  return {
    ok: true,
    routed: true,
    domain,
    transcript: heard.transcript,
    orthographyRecovered: false,
    generalStt: false,
    task: task ? { ok: task.ok, members: task.members, completed: task.merged?.completed || 0 } : null,
    voiceId: profile.voiceId,
    officialVoiceUsed: false,
    salesEnabled: isSalesEnabled(),
    live: false,
    network: false,
  };
}

function recentHistory() {
  return history.map((row) => ({ ...row }));
}

function clearHistory() {
  history.length = 0;
}

function rosterVoices() {
  return ids().map((id) => profileFor(id));
}

module.exports = {
  profileFor,
  synthesizeStaff,
  transcribeStaff,
  voiceRequest,
  recentHistory,
  clearHistory,
  rosterVoices,
  alignToAudio,
  PHRASES,
};
