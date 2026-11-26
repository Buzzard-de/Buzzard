/**
 * In-process WebRTC signaling. No media, SIP, STT, or PSTN.
 */
const crypto = require("crypto");
const { assessVoice } = require("./voiceReadiness");

const rooms = new Map();

function createRoom({ participants = [] } = {}) {
  const id = `rtc_${crypto.randomBytes(6).toString("hex")}`;
  const room = {
    id,
    participants: [...participants],
    offers: [],
    answers: [],
    ice: [],
    liveMedia: false,
    createdAt: new Date().toISOString(),
  };
  rooms.set(id, room);
  return { ok: true, room: { id, participants: room.participants, liveMedia: false } };
}

function postSignal({ roomId, kind, fromId, payload }) {
  const room = rooms.get(roomId);
  if (!room) return { ok: false, code: "ROOM_NOT_FOUND" };
  if (!["offer", "answer", "ice"].includes(kind)) return { ok: false, code: "BAD_KIND" };
  const entry = { fromId, payload, at: new Date().toISOString() };
  if (kind === "offer") room.offers.push(entry);
  if (kind === "answer") room.answers.push(entry);
  if (kind === "ice") room.ice.push(entry);
  return { ok: true, liveMedia: false };
}

function getRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  return { ...room, liveMedia: false };
}

function sendMedia({ roomId, fromId, toId, payload } = {}) {
  const room = rooms.get(roomId);
  if (!room) return { ok: false, code: "ROOM_NOT_FOUND", network: false, carrier: false };
  if (room.dropped) return { ok: false, code: "MEDIA_DROPPED", network: false, carrier: false, iceConnected: false };
  if (!room.participants.includes(fromId) || !room.participants.includes(toId)) {
    return { ok: false, code: "NOT_A_PARTICIPANT", network: false, carrier: false };
  }
  if (!room.offers.length || !room.answers.length) return { ok: false, code: "SIGNALING_REQUIRED", network: false, carrier: false };
  const frame = Buffer.isBuffer(payload) ? Buffer.from(payload) : Buffer.from(String(payload || ""));
  if (!frame.length) return { ok: false, code: "EMPTY_FRAME", network: false, carrier: false };
  room.media = room.media || [];
  room.media.push({ fromId, toId, bytes: frame.length });
  return {
    ok: true,
    bytes: frame.length,
    toId,
    transported: "IN_PROCESS",
    network: false,
    carrier: false,
    placedOnCarrier: false,
    iceConnected: false,
    dtls: false,
    peerConnection: false,
  };
}

function dropRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) return { ok: false, code: "ROOM_NOT_FOUND" };
  room.dropped = true;
  room.media = [];
  return { ok: true, state: "dropped", network: false, carrier: false, iceConnected: false };
}

function reconnectRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) return { ok: false, code: "ROOM_NOT_FOUND" };
  room.dropped = false;
  return { ok: true, state: "open", network: false, carrier: false, iceConnected: false, peerConnection: false };
}

function readiness() {
  const voice = assessVoice();
  return {
    ...voice,
    webrtcCode: true,
    signaling: true,
    liveCalls: false,
    conferences: false,
    note: voice.missing.length
      ? "Signaling is local-only. Live SIP/STT/TTS calls remain BLOCKED."
      : voice.note,
  };
}

module.exports = { createRoom, postSignal, getRoom, sendMedia, dropRoom, reconnectRoom, readiness };
