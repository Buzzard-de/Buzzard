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

module.exports = { createRoom, postSignal, getRoom, readiness };
