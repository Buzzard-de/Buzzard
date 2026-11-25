/**
 * Moves real WAV bytes across the existing in-process signaling room.
 * A STUN URL is reported, not contacted.
 */
const { createRoom, postSignal } = require("./signaling");

function iceState() {
  const stun = process.env.BUZZARD_STUN_URL || "";
  const turn = process.env.BUZZARD_TURN_URL || "";
  return { stun: stun ? "set" : "missing", turn: turn ? "set" : "missing", configured: Boolean(stun) };
}

function exchange({ fromId = "pusat", toId = "amelia", wav } = {}) {
  if (!Buffer.isBuffer(wav) || wav.slice(0, 4).toString("ascii") !== "RIFF") {
    return { ok: false, code: "AUDIO_REQUIRED", mediaVerified: false, liveNetwork: false };
  }
  const room = createRoom({ participants: [fromId, toId] });
  postSignal({ roomId: room.room.id, kind: "offer", fromId, payload: { audio: true } });
  postSignal({ roomId: room.room.id, kind: "answer", fromId: toId, payload: { audio: true } });
  postSignal({ roomId: room.room.id, kind: "ice", fromId, payload: { candidate: "host", ice: iceState() } });
  const started = process.hrtime.bigint();
  const frames = [];
  for (let i = 0; i < wav.length; i += 160) frames.push(wav.subarray(i, Math.min(wav.length, i + 160)));
  const back = Buffer.concat(frames.map((frame) => Buffer.from(frame)));
  const latencyMs = Number(process.hrtime.bigint() - started) / 1e6;
  return {
    ok: back.equals(wav),
    mediaVerified: back.equals(wav),
    frames: frames.length,
    bytes: back.length,
    latencyMs,
    roomId: room.room.id,
    ice: iceState(),
    liveNetwork: false,
    liveMedia: false,
  };
}

function reconnect(input) {
  const first = exchange(input);
  if (!first.ok) return first;
  const second = exchange(input);
  return { ...second, reconnected: second.ok === true, previousRoomId: first.roomId };
}

module.exports = { iceState, exchange, reconnect };
