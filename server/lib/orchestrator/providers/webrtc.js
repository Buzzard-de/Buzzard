const crypto = require("crypto");
const { getFlags, isProduction } = require("../flags");
const voice = require("../voiceSession");
const { VOICE_STATE } = require("../constants");

const rooms = new Map();

function httpsRequired(req) {
  if (!isProduction()) return { ok: true };
  const proto = String(req?.headers?.["x-forwarded-proto"] || req?.protocol || "").split(",")[0].trim();
  const host = String(req?.headers?.host || "");
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) return { ok: true };
  if (proto === "https" || req?.secure) return { ok: true };
  return { ok: false, code: "WEBRTC_HTTPS_REQUIRED" };
}

function getRoom(sessionId) {
  return rooms.get(sessionId) || null;
}

function createSignalSession({ userId, conversationId, language, req } = {}) {
  const flags = getFlags();
  if (!flags.VOICE_ENABLED) return { ok: false, code: "VOICE_DISABLED" };
  if (!flags.VOICE_WEBRTC_ENABLED) return { ok: false, code: "VOICE_WEBRTC_DISABLED" };
  const https = httpsRequired(req);
  if (!https.ok) return https;
  const session = voice.createSession({ userId, conversationId, language });
  const token = crypto.randomBytes(24).toString("hex");
  rooms.set(session.id, {
    sessionId: session.id,
    token,
    conversationId: conversationId || session.conversation_id,
    offer: null,
    answer: null,
    ice: [],
    connectionState: "CONNECTING",
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * 60 * 1000,
  });
  voice.setState(session.id, VOICE_STATE.CONNECTING);
  return { ok: true, session, token, connectionState: "CONNECTING" };
}

function authorize(sessionId, token) {
  const room = getRoom(sessionId);
  if (!room) return { ok: false, code: "SESSION_NOT_FOUND" };
  if (Date.now() > room.expiresAt) return { ok: false, code: "WEBRTC_SESSION_EXPIRED" };
  if (!token || token !== room.token) return { ok: false, code: "WEBRTC_AUTH_FAILED" };
  return { ok: true, room };
}

function setOffer(sessionId, token, sdp) {
  const auth = authorize(sessionId, token);
  if (!auth.ok) return auth;
  if (!sdp) return { ok: false, code: "WEBRTC_OFFER_REQUIRED" };
  auth.room.offer = sdp;
  auth.room.connectionState = "NEGOTIATING";
  return { ok: true, sessionId, connectionState: auth.room.connectionState };
}

function setAnswer(sessionId, token, sdp) {
  const auth = authorize(sessionId, token);
  if (!auth.ok) return auth;
  if (!auth.room.offer) return { ok: false, code: "WEBRTC_OFFER_REQUIRED" };
  if (!sdp) return { ok: false, code: "WEBRTC_ANSWER_REQUIRED" };
  auth.room.answer = sdp;
  auth.room.connectionState = "CONNECTED";
  voice.setState(sessionId, VOICE_STATE.CONNECTED);
  return { ok: true, sessionId, connectionState: "CONNECTED" };
}

function addIce(sessionId, token, candidate) {
  const auth = authorize(sessionId, token);
  if (!auth.ok) return auth;
  if (candidate) auth.room.ice.push(candidate);
  return { ok: true, iceCount: auth.room.ice.length, connectionState: auth.room.connectionState };
}

function connectionState(sessionId) {
  const room = getRoom(sessionId);
  if (!room) return { ok: false, code: "SESSION_NOT_FOUND", connectionState: "FAILED" };
  const connected = Boolean(room.offer && room.answer);
  return {
    ok: true,
    connectionState: connected ? "CONNECTED" : room.connectionState,
    fakeConnected: false,
  };
}

function disconnect(sessionId, token) {
  const auth = authorize(sessionId, token);
  if (!auth.ok) return auth;
  auth.room.connectionState = "ENDED";
  voice.endSession(sessionId);
  rooms.delete(sessionId);
  return { ok: true, connectionState: "ENDED" };
}

function reconnect(sessionId, token) {
  const auth = authorize(sessionId, token);
  if (!auth.ok) return auth;
  auth.room.offer = null;
  auth.room.answer = null;
  auth.room.ice = [];
  auth.room.connectionState = "CONNECTING";
  auth.room.expiresAt = Date.now() + 30 * 60 * 1000;
  voice.setState(sessionId, VOICE_STATE.CONNECTING);
  return { ok: true, connectionState: "CONNECTING" };
}

function health() {
  const flags = getFlags();
  if (!flags.VOICE_WEBRTC_ENABLED) return "NOT_CONFIGURED";
  return "HEALTHY";
}

module.exports = {
  createSignalSession,
  setOffer,
  setAnswer,
  addIce,
  connectionState,
  disconnect,
  reconnect,
  httpsRequired,
  health,
  getRoom,
};
