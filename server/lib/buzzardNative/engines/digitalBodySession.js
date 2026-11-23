/**
 * One digital_body runtime for every council profile.
 * Sessions and voice bindings live here. A missing provider does not speak or draw.
 */
const crypto = require("crypto");
const { VOICE_ID, analyzeOfficialVoice } = require("../speech/voiceIdentity");

const LANGUAGES = Object.freeze(["tr", "de", "en", "ar"]);
const VISUAL = Object.freeze([
  "lip_sync",
  "expression",
  "eyes_head",
  "arms",
  "full_body",
  "walk_sit",
  "objects",
  "wardrobe",
]);

const PROFILES = Object.freeze({
  sinan: Object.freeze({
    agentId: "sinan_bey",
    avatar: "/council/sinan-bey.png",
    voiceId: VOICE_ID,
    personality: "serious_calm_professional",
    behavior: "reports_architecture",
    duty: "chief_software_architect",
  }),
  esat: Object.freeze({
    agentId: "esat_bey",
    avatar: "/council/esat-bey.png",
    voiceId: "esat_bey_voice_unassigned",
    personality: "defense_precise",
    behavior: "checks_boundaries",
    duty: "defense",
  }),
  dogu: Object.freeze({
    agentId: "dogu_bey",
    avatar: "/council/dogu-bey.png",
    voiceId: "dogu_bey_voice_unassigned",
    personality: "research_cautious",
    behavior: "marks_unverified",
    duty: "research",
  }),
  mira: Object.freeze({
    agentId: "mira",
    avatar: "/council/mira.png",
    voiceId: "mira_voice_unassigned",
    personality: "catalog_precise",
    behavior: "stays_in_catalog",
    duty: "catalog",
  }),
  leon: Object.freeze({
    agentId: "leon",
    avatar: "/council/leon.png",
    voiceId: "leon_voice_unassigned",
    personality: "logistics_plain",
    behavior: "no_live_label",
    duty: "logistics",
  }),
  amelia: Object.freeze({
    agentId: "amelia",
    avatar: "/council/amelia.png",
    voiceId: "amelia_voice_unassigned",
    personality: "service_clear",
    behavior: "no_customer_data",
    duty: "service",
  }),
  adrian: Object.freeze({
    agentId: "adrian",
    avatar: "/council/adrian.png",
    voiceId: "adrian_voice_unassigned",
    personality: "markets_careful",
    behavior: "no_live_listing",
    duty: "markets",
  }),
});

const sessions = new Map();

function profile(key) {
  return PROFILES[key] || null;
}

function voiceStatus(key) {
  const who = profile(key);
  if (!who) return { ok: false, code: "PROFILE_UNKNOWN", ready: false, ttsReady: false };
  if (who.agentId !== "sinan_bey") {
    return { ok: true, ready: false, ttsReady: false, filePresent: false, voiceId: who.voiceId, code: "VOICE_REFERENCE_ABSENT", naturalSpeech: false };
  }
  const analysis = analyzeOfficialVoice({ actorId: "sinan_bey" });
  return {
    ok: true,
    ready: false,
    ttsReady: false,
    naturalSpeech: false,
    voiceId: VOICE_ID,
    filePresent: analysis.code !== "MISSING_REFERENCE_AUDIO",
    code: analysis.code || "VOICE_NOT_READY",
  };
}

function callProvider(capability, fn) {
  if (typeof fn !== "function") {
    return { ok: false, code: "PROVIDER_ABSENT", capability, ran: false, rendered: false, audio: false, bytes: 0, sessionAlive: true, fake: false };
  }
  try {
    const result = fn();
    return { ok: result?.ok === true, code: result?.code || "PROVIDER_RESULT", capability, ran: result?.ran === true, rendered: false, audio: false, bytes: 0, sessionAlive: true, fake: false };
  } catch {
    return { ok: false, code: "PROVIDER_FAULT", capability, ran: false, rendered: false, audio: false, bytes: 0, sessionAlive: true, fake: false };
  }
}

function openSession({ actorId, profileKey, lang = "tr" } = {}) {
  const who = profile(profileKey);
  if (!who) return { ok: false, code: "PROFILE_UNKNOWN", audio: false };
  if (!LANGUAGES.includes(lang)) return { ok: false, code: "LANGUAGE_SLOT_UNKNOWN", audio: false, rendered: false };
  if (actorId !== "pusat" && actorId !== who.agentId) return { ok: false, code: "PROFILE_FORBIDDEN", audio: false };
  const id = `body_${crypto.randomBytes(6).toString("hex")}`;
  const row = {
    id,
    profileKey,
    agentId: who.agentId,
    avatar: who.avatar,
    voiceId: who.voiceId,
    lang,
    state: "open",
    engine: "digital_body",
  };
  sessions.set(id, row);
  return { ok: true, sessionId: id, engine: "digital_body", agentId: who.agentId, voiceId: who.voiceId, avatar: who.avatar, lang, audio: false, rendered: false };
}

function session(id) {
  return sessions.get(id) || null;
}

function speak(sessionId, { text } = {}) {
  const row = session(sessionId);
  if (!row) return { ok: false, code: "SESSION_UNKNOWN", audio: false };
  if (row.state === "interrupted") return { ok: false, code: "SESSION_INTERRUPTED", audio: false, voiceId: row.voiceId };
  if (row.state === "error") return { ok: false, code: "SESSION_ERROR", audio: false, voiceId: row.voiceId };
  const said = callProvider("tts", null);
  return { ...said, voiceId: row.voiceId, agentId: row.agentId, lang: row.lang, textAccepted: typeof text === "string", audio: false };
}

function hear(sessionId) {
  const row = session(sessionId);
  if (!row) return { ok: false, code: "SESSION_UNKNOWN", transcript: null };
  if (row.state === "interrupted") return { ok: false, code: "SESSION_INTERRUPTED", transcript: null };
  const heard = callProvider("stt", null);
  return { ...heard, transcript: null, lang: row.lang, agentId: row.agentId };
}

function interrupt(sessionId, { actorId } = {}) {
  const row = session(sessionId);
  if (!row) return { ok: false, code: "SESSION_UNKNOWN" };
  if (actorId !== "pusat" && actorId !== row.agentId) return { ok: false, code: "PROFILE_FORBIDDEN", state: row.state };
  row.state = "interrupted";
  return { ok: true, code: "INTERRUPTED", state: row.state, audio: false };
}

function restart(sessionId, { actorId } = {}) {
  const row = session(sessionId);
  if (!row) return { ok: false, code: "SESSION_UNKNOWN" };
  if (actorId !== "pusat" && actorId !== row.agentId) return { ok: false, code: "PROFILE_FORBIDDEN", state: row.state };
  row.state = "open";
  return { ok: true, code: "RESTARTED", state: row.state, audio: false, voiceId: row.voiceId };
}

function changeProfile(sessionId, { actorId, nextKey, confirm = null } = {}) {
  const row = session(sessionId);
  if (!row) return { ok: false, code: "SESSION_UNKNOWN", changed: false };
  const before = row.voiceId;
  if (actorId !== "pusat" || confirm !== "PROFILE_CHANGE") {
    return { ok: false, code: "PROFILE_CHANGE_FORBIDDEN", changed: false, voiceId: before };
  }
  const next = profile(nextKey);
  if (!next) return { ok: false, code: "PROFILE_UNKNOWN", changed: false, voiceId: before };
  row.profileKey = nextKey;
  row.agentId = next.agentId;
  row.avatar = next.avatar;
  row.voiceId = next.voiceId;
  return { ok: true, code: "PROFILE_CHANGED", changed: true, agentId: row.agentId, voiceId: row.voiceId, previousVoiceId: before };
}

function animate(sessionId, capability) {
  const row = session(sessionId);
  if (!row) return { ok: false, code: "SESSION_UNKNOWN", rendered: false };
  if (!VISUAL.includes(capability)) return { ok: false, code: "CAPABILITY_UNKNOWN", rendered: false };
  return { ...callProvider(capability, null), agentId: row.agentId, cssIsNotABody: true, rendered: false };
}

function pusatRoute({ actorId, profileKey, lang = "tr", text = "" } = {}) {
  if (actorId !== "pusat") return { ok: false, code: "ORCHESTRATOR_REQUIRED", spoke: false, routed: false };
  const opened = openSession({ actorId, profileKey, lang });
  if (!opened.ok) return { ...opened, spoke: false, routed: false };
  const said = speak(opened.sessionId, { text });
  return { ok: true, routed: true, spoke: false, audio: false, sessionId: opened.sessionId, voiceId: said.voiceId, speech: said.code };
}

function clearSessions() {
  sessions.clear();
}

module.exports = {
  LANGUAGES,
  VISUAL,
  PROFILES,
  profile,
  voiceStatus,
  callProvider,
  openSession,
  session,
  speak,
  hear,
  interrupt,
  restart,
  changeProfile,
  animate,
  pusatRoute,
  clearSessions,
};
