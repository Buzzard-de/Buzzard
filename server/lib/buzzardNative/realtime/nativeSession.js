const crypto = require("crypto");

const ALLOWED = new Set(["sinan_bey", "pusat", "esat_bey", "dogu_bey"]);

function createSessionHub() {
  const sessions = new Map();

  function open({ actorId, participants = [] } = {}) {
    if (!ALLOWED.has(actorId)) return { ok: false, code: "UNAUTHORIZED_ACTOR" };
    const bad = participants.filter((p) => !ALLOWED.has(p));
    if (bad.length) return { ok: false, code: "UNAUTHORIZED_PARTICIPANT", bad };
    const id = `ns_${crypto.randomBytes(4).toString("hex")}`;
    const s = { id, participants: [...new Set([actorId, ...participants])], packets: [], open: true };
    sessions.set(id, s);
    return { ok: true, sessionId: id, liveMedia: false, webrtcMedia: false };
  }

  function send({ sessionId, actorId, bytes }) {
    const s = sessions.get(sessionId);
    if (!s || !s.open) return { ok: false, code: "SESSION_CLOSED" };
    if (!s.participants.includes(actorId)) return { ok: false, code: "UNAUTHORIZED_PARTICIPANT" };
    const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes || []);
    const sha256 = crypto.createHash("sha256").update(buf).digest("hex");
    s.packets.push({ actorId, sha256, n: buf.length, at: Date.now() });
    return { ok: true, packets: s.packets.length, liveMedia: false, transport: "in_process_buffer" };
  }

  function close({ sessionId, actorId }) {
    const s = sessions.get(sessionId);
    if (!s) return { ok: false, code: "SESSION_NOT_FOUND" };
    if (!s.participants.includes(actorId)) return { ok: false, code: "UNAUTHORIZED_PARTICIPANT" };
    s.open = false;
    return { ok: true, closed: true, packetCount: s.packets.length, liveCommunicationPass: false };
  }

  function disconnect({ sessionId }) {
    const s = sessions.get(sessionId);
    if (!s) return { ok: false, code: "SESSION_NOT_FOUND" };
    s.open = false;
    s.disconnected = true;
    return { ok: true, disconnected: true, liveMedia: false };
  }

  function reconnect({ sessionId, actorId }) {
    const s = sessions.get(sessionId);
    if (!s) return { ok: false, code: "SESSION_NOT_FOUND" };
    if (!s.participants.includes(actorId)) return { ok: false, code: "UNAUTHORIZED_PARTICIPANT" };
    s.open = true;
    s.disconnected = false;
    return { ok: true, reconnected: true, liveMedia: false };
  }

  return { open, send, close, disconnect, reconnect };
}

module.exports = { createSessionHub, ALLOWED };
