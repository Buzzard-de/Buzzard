/**
 * One shared floor for the existing 17-member council.
 * Personal voice files and character files stay blocked when they are absent.
 * This is not a second orchestrator and not a carrier call.
 */
const { ids, getAgent } = require("../buzzardNative/core/identityRegistry");
const { canUse } = require("../buzzardNative/core/capabilityRegistry");
const { isSalesEnabled } = require("../salesMode");

function faceOf(agentId, wav, state) {
  const { presentSpeaker } = require("./meshAvatar");
  const face = presentSpeaker({ agentId, wav, state });
  return {
    agentId: face.agentId,
    state: face.state,
    lipSync: face.lipSync === true,
    peakJaw: face.peakJaw || 0,
    stopped: face.stopped === true,
    previewMesh: face.previewMesh === true,
    realCharacter: face.realCharacter === true,
    digitalHuman: face.digitalHuman === true,
    photoreal: face.photoreal === true,
    scannedBody: face.scannedBody === true,
    css: face.css === true,
    is3d: face.is3d === true,
    assetStatus: face.assetStatus,
    avatarError: face.avatarError || null,
  };
}

function openCouncilFloor({ topic = "kurmay" } = {}) {
  const roster = ids();
  if (roster.length !== 17) return { ok: false, code: "ROSTER_SIZE", members: roster.length };
  const { councilAssets } = require("./naturalSpeech");
  const assets = councilAssets();
  const seats = new Map();
  for (const asset of assets) {
    const agent = getAgent(asset.agentId);
    seats.set(asset.agentId, {
      agentId: asset.agentId,
      name: agent?.display_name || asset.agentId,
      role: asset.role,
      speech: asset.speech === true,
      personalVoice: asset.personalVoice,
      avatarAsset: asset.avatarAsset,
      ownVoice: false,
      sharedVoice: false,
      pose: asset.speech ? "listening" : "idle",
      lipSync: false,
      peakJaw: 0,
      heard: [],
    });
  }
  const room = {
    ok: true,
    engine: "digital_body",
    sharedEngine: true,
    engines: 1,
    topic,
    user: null,
    turns: [],
    transcript: [],
    ran: false,
    closed: false,
  };

  function snapshot() {
    return {
      ...room,
      seats: [...seats.values()].map((seat) => ({ ...seat, heard: seat.heard.slice() })),
      turns: room.turns.map((turn) => ({ ...turn })),
      transcript: room.transcript.slice(),
    };
  }

  function publish(entry) {
    room.transcript.push(entry);
    for (const seat of seats.values()) seat.heard = room.transcript.slice();
  }

  function poseRoom(speakerId, wav) {
    const poses = {};
    for (const seat of seats.values()) {
      const speaking = seat.agentId === speakerId;
      const state = speaking ? "speaking" : (seat.speech ? "listening" : "idle");
      let face;
      try {
        face = faceOf(seat.agentId, speaking ? wav : null, state);
      } catch {
        face = { agentId: seat.agentId, state, lipSync: false, peakJaw: 0, stopped: true, previewMesh: true, realCharacter: false, digitalHuman: false, photoreal: false, scannedBody: false, css: false, is3d: false, assetStatus: seat.avatarAsset, avatarError: "AVATAR_LOAD_FAILED" };
      }
      seat.pose = face.state;
      seat.lipSync = speaking ? face.lipSync : false;
      seat.peakJaw = speaking ? face.peakJaw : 0;
      poses[seat.agentId] = face;
    }
    return poses;
  }

  return {
    ok: true,
    join(userId) {
      if (room.closed) return { ok: false, code: "MEETING_CLOSED" };
      if (!userId || seats.has(userId)) return { ok: false, code: "USER_REQUIRED", joined: false };
      room.user = { userId, joined: true };
      return { ok: true, userId, joined: true, member: false };
    },
    run({ faultAgent = null } = {}) {
      if (room.ran) return { ok: false, code: "ALREADY_RUN" };
      room.ran = true;
      const { speakNatural } = require("./naturalSpeech");
      for (const agentId of roster) {
        const seat = seats.get(agentId);
        if (!seat.speech) {
          room.turns.push({ agentId, speech: false, audio: false, error: null, ownVoice: false, sharedVoice: false });
          continue;
        }
        if (faultAgent === agentId) {
          const failed = { agentId, speech: true, audio: false, error: "MEMBER_FAILED", ownVoice: false, sharedVoice: false, personalVoice: seat.personalVoice };
          room.turns.push(failed);
          publish({ agentId, text: null, error: "MEMBER_FAILED", sha256: null });
          continue;
        }
        const text = `${seat.name} rapor sunar.`;
        let spoken;
        try {
          spoken = speakNatural({ text, lang: "tr", agentId, turkish: true });
        } catch {
          spoken = { ok: false, code: "MEMBER_FAILED" };
        }
        if (!spoken.ok) {
          room.turns.push({ agentId, speech: true, audio: false, error: spoken.code || "TTS_FAILED", ownVoice: false, sharedVoice: false, personalVoice: seat.personalVoice });
          publish({ agentId, text: null, error: spoken.code || "TTS_FAILED", sha256: null });
          continue;
        }
        const poses = poseRoom(agentId, spoken.wav);
        const speaking = Object.values(poses).filter((face) => face.state === "speaking").map((face) => face.agentId);
        seat.sharedVoice = spoken.sharedVoice === true;
        seat.ownVoice = spoken.ownVoice === true;
        room.turns.push({
          agentId,
          speech: true,
          audio: true,
          error: null,
          bytes: spoken.bytes,
          sha256: spoken.sha256,
          modelFile: spoken.modelFile,
          ownVoice: spoken.ownVoice === true,
          sharedVoice: spoken.sharedVoice === true,
          personalVoice: spoken.personalAsset,
          voiceId: spoken.voiceId,
          lipSync: poses[agentId].lipSync === true,
          peakJaw: poses[agentId].peakJaw,
          previewMesh: poses[agentId].previewMesh === true,
          realCharacter: poses[agentId].realCharacter === true,
          digitalHuman: poses[agentId].digitalHuman === true,
          photoreal: false,
          css: false,
          assetStatus: poses[agentId].assetStatus,
          onlySpeaker: speaking.length === 1 && speaking[0] === agentId,
          listenerJaw: Math.max(0, ...Object.entries(poses).filter(([id]) => id !== agentId).map(([, face]) => face.peakJaw || 0)),
        });
        publish({ agentId, text: spoken.spokenText, error: null, sha256: spoken.sha256, modelFile: spoken.modelFile });
        seat.pose = "listening";
        seat.lipSync = false;
        seat.peakJaw = 0;
      }
      return { ok: true, turns: room.turns.length };
    },
    privateCall({ agentId, text, hear = false } = {}) {
      if (!room.user) return { ok: false, code: "USER_REQUIRED", audio: false, carrier: false };
      if (!seats.has(agentId)) return { ok: false, code: "MEMBER_UNKNOWN", audio: false, carrier: false };
      const seat = seats.get(agentId);
      const base = {
        userId: room.user.userId,
        agentId,
        participants: [room.user.userId, agentId],
        alone: true,
        carrier: false,
        internet: false,
        phoneLine: "BLOCKED_EXTERNAL",
        paid: false,
        digitalHuman: false,
        photoreal: false,
        realCharacter: false,
      };
      if (!seat.speech) {
        return { ...base, ok: false, code: "SPEECH_DENIED", audio: false, ownVoice: false, sharedVoice: false };
      }
      const { speakNatural, recognizeNatural } = require("./naturalSpeech");
      let spoken;
      try {
        spoken = speakNatural({ text: text || `${seat.name} gorusmede.`, lang: "tr", agentId, turkish: true });
      } catch {
        spoken = { ok: false, code: "MEMBER_FAILED" };
      }
      if (!spoken.ok) return { ...base, ok: false, code: spoken.code || "TTS_FAILED", audio: false };
      const face = faceOf(agentId, spoken.wav, "speaking");
      let heard = null;
      if (hear) {
        try {
          heard = recognizeNatural({ wav: spoken.wav, lang: "tr" });
        } catch {
          heard = { ok: false, code: "STT_FAILED", transcript: null, replaced: false, paid: false };
        }
      }
      return {
        ...base,
        ok: true,
        code: "PRIVATE_LOCAL",
        audio: true,
        bytes: spoken.bytes,
        sha256: spoken.sha256,
        modelFile: spoken.modelFile,
        ownVoice: spoken.ownVoice === true,
        sharedVoice: spoken.sharedVoice === true,
        personalVoice: spoken.personalAsset,
        lipSync: face.lipSync === true,
        peakJaw: face.peakJaw,
        previewMesh: face.previewMesh === true,
        assetStatus: face.assetStatus,
        heard: heard ? { ok: heard.ok === true, code: heard.code, transcript: heard.transcript, replaced: heard.replaced === true, paid: heard.paid === true } : null,
      };
    },
    close() {
      room.closed = true;
      const spoken = room.turns.filter((turn) => turn.audio === true);
      const faults = room.turns.filter((turn) => turn.error);
      const seatList = [...seats.values()];
      return {
        ok: room.ran === true,
        chair: "pusat",
        topic: room.topic,
        members: seatList.length,
        user: room.user,
        spoken: spoken.length,
        silent: seatList.filter((seat) => seat.speech !== true).map((seat) => seat.agentId),
        faults: faults.map((turn) => ({ agentId: turn.agentId, error: turn.error })),
        reports: room.transcript.filter((row) => row.error == null).length,
        followed: seatList.every((seat) => seat.heard.length === room.transcript.length),
        salesEnabled: isSalesEnabled(),
        personalVoices: seatList.every((seat) => seat.personalVoice === "BLOCKED_ASSET") ? "BLOCKED_ASSET" : "PARTIAL",
        characters: seatList.every((seat) => seat.avatarAsset === "BLOCKED_ASSET") ? "BLOCKED_ASSET" : "PARTIAL",
        sharedEngine: "digital_body",
        engines: 1,
        digitalHuman: false,
        photoreal: false,
        realCharacter: false,
        carrier: false,
        internet: false,
        paid: false,
      };
    },
    snapshot,
  };
}

module.exports = { openCouncilFloor };
