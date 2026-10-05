const crypto = require("crypto");
const { db } = require("../db");
const { VOICE_STATE } = require("./constants");
const vad = require("./providers/vad");
const stt = require("./providers/stt");
const tts = require("./providers/tts");
const { checkLimit } = require("./rateLimit");

const ttsStreams = new Map();
const lastReply = new Map();

const TRANSITIONS = {
  [VOICE_STATE.CREATED]: [VOICE_STATE.CONNECTING, VOICE_STATE.FAILED, VOICE_STATE.ENDED],
  [VOICE_STATE.CONNECTING]: [VOICE_STATE.CONNECTED, VOICE_STATE.LISTENING, VOICE_STATE.FAILED, VOICE_STATE.ENDED],
  [VOICE_STATE.CONNECTED]: [VOICE_STATE.LISTENING, VOICE_STATE.ENDING, VOICE_STATE.FAILED],
  [VOICE_STATE.LISTENING]: [VOICE_STATE.TRANSCRIBING, VOICE_STATE.INTERRUPTED, VOICE_STATE.ENDING, VOICE_STATE.FAILED],
  [VOICE_STATE.TRANSCRIBING]: [VOICE_STATE.THINKING, VOICE_STATE.LISTENING, VOICE_STATE.FAILED],
  [VOICE_STATE.THINKING]: [VOICE_STATE.SPEAKING, VOICE_STATE.ENDING, VOICE_STATE.FAILED],
  [VOICE_STATE.SPEAKING]: [VOICE_STATE.INTERRUPTED, VOICE_STATE.LISTENING, VOICE_STATE.PAUSED, VOICE_STATE.HANDOFF, VOICE_STATE.ENDING, VOICE_STATE.FAILED],
  [VOICE_STATE.INTERRUPTED]: [VOICE_STATE.LISTENING, VOICE_STATE.TRANSCRIBING, VOICE_STATE.ENDING, VOICE_STATE.FAILED],
  [VOICE_STATE.PAUSED]: [VOICE_STATE.LISTENING, VOICE_STATE.HANDOFF, VOICE_STATE.ENDING, VOICE_STATE.FAILED],
  [VOICE_STATE.HANDOFF]: [VOICE_STATE.ENDING, VOICE_STATE.ENDED, VOICE_STATE.FAILED],
  [VOICE_STATE.ENDING]: [VOICE_STATE.ENDED],
  [VOICE_STATE.ENDED]: [],
  [VOICE_STATE.FAILED]: [],
};

function createSession({ userId, conversationId, language } = {}) {
  const id = `vs_${crypto.randomBytes(8).toString("hex")}`;
  const token = crypto.randomBytes(16).toString("hex");
  db.prepare(
    `INSERT INTO orch_voice_sessions(id, user_id, conversation_id, language, state)
     VALUES (?,?,?,?,?)`
  ).run(id, userId || null, conversationId || null, language || "de", VOICE_STATE.CREATED);
  try {
    db.prepare("UPDATE orch_voice_sessions SET session_token = ? WHERE id = ?").run(token, id);
  } catch {
    /* column may be missing on older DBs until migrate runs */
  }
  setState(id, VOICE_STATE.CONNECTING);
  return getSession(id);
}

function getSession(id) {
  return db.prepare("SELECT * FROM orch_voice_sessions WHERE id = ?").get(id) || null;
}

function setState(id, state, options = {}) {
  const session = getSession(id);
  if (!session) return { ok: false, code: "SESSION_NOT_FOUND" };
  const current = session.state === "ERROR" ? VOICE_STATE.FAILED : session.state;
  const next = state === "ERROR" ? VOICE_STATE.FAILED : state;
  const allowed = TRANSITIONS[current] || [];
  if (current !== next && allowed.length && !allowed.includes(next) && !options.force) {
    return { ok: false, code: "INVALID_STATE_TRANSITION", session, from: current, to: next };
  }
  db.prepare("UPDATE orch_voice_sessions SET state = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(next, id);
  return getSession(id);
}

function cancelTts(id) {
  const stream = ttsStreams.get(id);
  if (stream) stream.cancelled = true;
  ttsStreams.delete(id);
  return { cancelled: Boolean(stream) };
}

function bargeIn(id) {
  const session = getSession(id);
  if (!session) return { ok: false, code: "SESSION_NOT_FOUND" };
  if (session.state === VOICE_STATE.SPEAKING) {
    cancelTts(id);
    setState(id, VOICE_STATE.INTERRUPTED);
    return { ok: true, ttsStopped: true, sttStarted: true, state: VOICE_STATE.INTERRUPTED };
  }
  setState(id, VOICE_STATE.LISTENING);
  return { ok: true, ttsStopped: false, sttStarted: true, state: VOICE_STATE.LISTENING };
}

async function ingestAudio(id, { energy, speaking, silenceMs, testTranscript, language, audio } = {}) {
  const limit = checkLimit({ sessionId: id, scope: "stt" });
  if (!limit.allowed) return { ok: false, code: "RATE_LIMITED" };
  const activity = vad.analyze({ energy, speaking, silenceMs });
  if (activity.interruption) {
    bargeIn(id);
  }
  const session = getSession(id);
  if (session?.state === VOICE_STATE.CONNECTING) setState(id, VOICE_STATE.CONNECTED);
  if (session?.state === VOICE_STATE.CONNECTED || session?.state === VOICE_STATE.CREATED) {
    setState(id, VOICE_STATE.LISTENING);
  }
  setState(id, VOICE_STATE.TRANSCRIBING);
  const transcript = await stt.transcribe({ language, testTranscript, audio, conversationId: session?.conversation_id });
  setState(id, VOICE_STATE.THINKING);
  return { session: getSession(id), activity, transcript };
}

async function speak(id, { text, language } = {}) {
  const hash = crypto.createHash("sha256").update(String(text || "")).digest("hex");
  if (lastReply.get(id) === hash) {
    return { session: getSession(id), audio: { ok: false, code: "DUPLICATE_RESPONSE_SUPPRESSED" } };
  }
  lastReply.set(id, hash);
  const limit = checkLimit({ sessionId: id, scope: "tts" });
  if (!limit.allowed) return { ok: false, code: "RATE_LIMITED" };
  setState(id, VOICE_STATE.SPEAKING);
  const handle = { cancelled: false };
  ttsStreams.set(id, handle);
  const audio = await tts.synthesize({ text, language });
  if (handle.cancelled) {
    return { session: getSession(id), audio: { ok: false, code: "TTS_INTERRUPTED" }, interrupted: true };
  }
  ttsStreams.delete(id);
  if (!audio.ok) setState(id, VOICE_STATE.FAILED);
  return { session: getSession(id), audio };
}

function heartbeat(id) {
  const session = getSession(id);
  if (!session) return { ok: false, code: "SESSION_NOT_FOUND" };
  try {
    db.prepare("UPDATE orch_voice_sessions SET last_heartbeat = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
  } catch {
    db.prepare("UPDATE orch_voice_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
  }
  return { ok: true, session: getSession(id) };
}

function endSession(id) {
  cancelTts(id);
  lastReply.delete(id);
  const session = getSession(id);
  if (session && session.state !== VOICE_STATE.ENDED && session.state !== VOICE_STATE.FAILED) {
    if (session.state !== VOICE_STATE.ENDING) setState(id, VOICE_STATE.ENDING);
    setState(id, VOICE_STATE.ENDED);
  }
  db.prepare("UPDATE orch_voice_sessions SET ended_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
  return getSession(id);
}

function listActive() {
  return db
    .prepare("SELECT * FROM orch_voice_sessions WHERE state NOT IN ('ENDED','ERROR','FAILED') ORDER BY created_at DESC LIMIT 50")
    .all();
}

function mute(id, muted = true) {
  try {
    db.prepare("UPDATE orch_voice_sessions SET muted = ? WHERE id = ?").run(muted ? 1 : 0, id);
  } catch {
    /* optional column */
  }
  return getSession(id);
}

module.exports = {
  createSession,
  getSession,
  setState,
  bargeIn,
  ingestAudio,
  speak,
  endSession,
  listActive,
  heartbeat,
  mute,
  cancelTts,
};
