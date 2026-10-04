const crypto = require("crypto");
const { db } = require("../db");
const { VOICE_STATE } = require("./constants");
const vad = require("./providers/vad");
const stt = require("./providers/stt");
const tts = require("./providers/tts");

function createSession({ userId, conversationId, language } = {}) {
  const id = `vs_${crypto.randomBytes(8).toString("hex")}`;
  db.prepare(
    `INSERT INTO orch_voice_sessions(id, user_id, conversation_id, language, state)
     VALUES (?,?,?,?,?)`
  ).run(id, userId || null, conversationId || null, language || "de", VOICE_STATE.CONNECTING);
  return getSession(id);
}

function getSession(id) {
  return db.prepare("SELECT * FROM orch_voice_sessions WHERE id = ?").get(id) || null;
}

function setState(id, state) {
  db.prepare("UPDATE orch_voice_sessions SET state = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
    state,
    id
  );
  return getSession(id);
}

function bargeIn(id) {
  const session = getSession(id);
  if (!session) return { ok: false, code: "SESSION_NOT_FOUND" };
  if (session.state === VOICE_STATE.SPEAKING) {
    setState(id, VOICE_STATE.INTERRUPTED);
    return { ok: true, ttsStopped: true, sttStarted: true, state: VOICE_STATE.INTERRUPTED };
  }
  setState(id, VOICE_STATE.LISTENING);
  return { ok: true, ttsStopped: false, sttStarted: true, state: VOICE_STATE.LISTENING };
}

async function ingestAudio(id, { energy, speaking, silenceMs, testTranscript, language } = {}) {
  const activity = vad.analyze({ energy, speaking, silenceMs });
  if (activity.interruption) {
    bargeIn(id);
  }
  setState(id, VOICE_STATE.THINKING);
  const transcript = await stt.transcribeAudio({ language, testTranscript });
  return { session: getSession(id), activity, transcript };
}

async function speak(id, { text, language } = {}) {
  setState(id, VOICE_STATE.SPEAKING);
  const audio = await tts.synthesize({ text, language });
  if (!audio.ok) setState(id, VOICE_STATE.ERROR);
  return { session: getSession(id), audio };
}

function endSession(id) {
  setState(id, VOICE_STATE.ENDED);
  db.prepare("UPDATE orch_voice_sessions SET ended_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
  return getSession(id);
}

function listActive() {
  return db
    .prepare("SELECT * FROM orch_voice_sessions WHERE state NOT IN ('ENDED','ERROR') ORDER BY created_at DESC LIMIT 50")
    .all();
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
};
