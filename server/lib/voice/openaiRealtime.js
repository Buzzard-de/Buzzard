/**
 * Optional hosted adapter. Buzzard voice does not call this module.
 * The key never leaves process.env and is never returned.
 */
const sessions = new Map();
const crypto = require("crypto");

function keyState() {
  const raw = process.env.OPENAI_API_KEY || "";
  return { configured: raw.trim().length > 0, key: raw.trim() ? "set" : "missing" };
}

function health() {
  return { ...keyState(), live: false, network: false, provider: "openai_realtime" };
}

function openSession({ agentId = "pusat" } = {}) {
  const state = keyState();
  if (!state.configured) return { ok: false, code: "NOT_CONFIGURED", live: false, network: false, key: "missing" };
  const id = `rt_${crypto.randomBytes(4).toString("hex")}`;
  sessions.set(id, { id, agentId, state: "open", bytesIn: 0, bytesOut: 0 });
  return { ok: false, code: "LIVE_CALLS_FORBIDDEN", sessionId: id, live: false, network: false, key: "set" };
}

function pushAudio(sessionId, audio) {
  const row = sessions.get(sessionId);
  if (!row || row.state !== "open") return { ok: false, code: "SESSION_CLOSED", live: false };
  const buf = Buffer.isBuffer(audio) ? audio : Buffer.alloc(0);
  row.bytesIn += buf.length;
  return { ok: true, accepted: buf.length, forwarded: false, live: false, network: false };
}

function closeSession(sessionId) {
  const row = sessions.get(sessionId);
  if (!row) return { ok: false, code: "SESSION_UNKNOWN" };
  row.state = "closed";
  return { ok: true, state: "closed", bytesIn: row.bytesIn, live: false, network: false };
}

module.exports = { health, openSession, pushAudio, closeSession };
