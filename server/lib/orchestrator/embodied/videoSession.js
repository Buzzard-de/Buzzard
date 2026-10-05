const crypto = require("crypto");
const { getFlags } = require("../flags");
const webrtc = require("../providers/webrtc");
const avatar = require("./avatarProvider");

const VIDEO_STATE = Object.freeze({
  CONNECTING: "CONNECTING",
  CONNECTED: "CONNECTED",
  LISTENING: "LISTENING",
  THINKING: "THINKING",
  WORKING: "WORKING",
  SPEAKING: "SPEAKING",
  INTERRUPTED: "INTERRUPTED",
  HANDOFF: "HANDOFF",
  ENDED: "ENDED",
  FAILED: "FAILED",
});

const sessions = new Map();

function videoConfigured() {
  return Boolean(process.env.VIDEO_PROVIDER && process.env.VIDEO_API_KEY);
}

function createSession({ userId, conversationId, language, cameraOn } = {}) {
  const flags = getFlags();
  if (!flags.VIDEO_ENABLED && !flags.EMBODIED_AI_ENABLED) {
    return { ok: false, code: "VIDEO_DISABLED", live: false };
  }
  const avatarHealth = avatar.health();
  const id = `vid_${crypto.randomBytes(6).toString("hex")}`;
  const row = {
    id,
    userId: userId || null,
    conversationId: conversationId || null,
    language: language || "de",
    cameraOn: Boolean(cameraOn),
    state: VIDEO_STATE.CONNECTING,
    liveAvatar: false,
    liveVideo: false,
    renderer: "CSS_3D_FALLBACK",
    avatarCode: avatarHealth.code,
    createdAt: Date.now(),
  };
  if (!videoConfigured() && !avatarHealth.ok) {
    row.state = VIDEO_STATE.FAILED;
    sessions.set(id, row);
    return {
      ok: false,
      code: "VIDEO_PROVIDER_NOT_CONFIGURED",
      session: row,
      live: false,
      fakeLiveVideo: false,
    };
  }
  sessions.set(id, row);
  return { ok: true, session: row, live: false, fallback: true, webrtc: webrtc.health() };
}

function getSession(id) {
  return sessions.get(id) || null;
}

function setState(id, state) {
  const row = sessions.get(id);
  if (!row) return { ok: false, code: "SESSION_NOT_FOUND" };
  if (state === VIDEO_STATE.CONNECTED && !row.liveVideo) {
    return { ok: false, code: "VIDEO_NOT_LIVE", session: row };
  }
  row.state = state;
  return { ok: true, session: row };
}

function endSession(id) {
  const row = sessions.get(id);
  if (!row) return { ok: false, code: "SESSION_NOT_FOUND" };
  row.state = VIDEO_STATE.ENDED;
  return { ok: true, session: row };
}

module.exports = {
  VIDEO_STATE,
  createSession,
  getSession,
  setState,
  endSession,
  videoConfigured,
};
