/**
 * Buzzard-owned motor program. No external AI APIs, no downloaded weights.
 * Status is CODE_READY architecture, not LIVE_VERIFIED inference.
 */
const STATUS = Object.freeze({
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  BLOCKED: "BLOCKED",
  CODE_READY: "CODE_READY",
  TESTED: "TESTED",
  SECURITY_REVIEWED: "SECURITY_REVIEWED",
  HUMAN_APPROVED: "HUMAN_APPROVED",
  LIVE_VERIFIED: "LIVE_VERIFIED",
});

function motor(id, extra = {}) {
  return {
    id,
    owner: "buzzard",
    externalApi: false,
    pretrainedWeightsPresent: false,
    liveVerified: false,
    status: STATUS.CODE_READY,
    tested: false,
    ...extra,
  };
}

function thinkingMotor() {
  return motor("thinking", {
    scope: ["tokenizer_design", "inference_loop", "tool_calling", "planning", "uncertainty"],
    prototypePlan: ["rule_and_search_first", "tiny_from_scratch_later", "no_claim_of_general_ai"],
    note: "No weights. No OpenAI/Claude runtime.",
  });
}

function hearingMotor() {
  return motor("hearing", {
    scope: ["audio_input", "vad", "asr", "noise", "speaker_id_consent", "tr_de_priority"],
    liveStt: false,
    privacy: "recordings_not_retained_by_default",
  });
}

function speechMotor() {
  return motor("speech", {
    scope: ["tts", "prosody", "voice_identity"],
    sinanVoiceTarget: "serious_calm_male",
    liveTts: false,
    naturalHumanClaim: false,
  });
}

function visionMotor() {
  return motor("vision", {
    scope: ["image_understand", "ocr", "landmarks", "video_frames"],
    liveVision: false,
  });
}

function memoryMotor() {
  return motor("memory", {
    scope: ["personal_partitions", "versioning", "restore"],
    encryption: process.env.BUZZARD_SINAN_MEMORY_KEY ? "KEY_PRESENT" : "UNCONFIGURED",
    offsite: false,
  });
}

function digitalBodyMotor() {
  return motor("digital_body", {
    avatarLocked: "/council/sinan-bey.png",
    lipSync: false,
    animation: false,
    roboticsSeparateProgram: true,
  });
}

function motionMotor() {
  return motor("motion", {
    gestures: false,
    audioToFace: false,
  });
}

function realtimeMotor() {
  return motor("realtime", {
    inProcessSignaling: true,
    liveMedia: false,
    webrtcLibraryBound: false,
    note: "server/lib/voice/signaling.js is in-process signaling only.",
  });
}

function catalog() {
  return {
    thinking: thinkingMotor(),
    hearing: hearingMotor(),
    speech: speechMotor(),
    vision: visionMotor(),
    memory: memoryMotor(),
    digital_body: digitalBodyMotor(),
    motion: motionMotor(),
    realtime: realtimeMotor(),
  };
}

module.exports = {
  STATUS,
  catalog,
  thinkingMotor,
  hearingMotor,
  speechMotor,
  visionMotor,
  memoryMotor,
  digitalBodyMotor,
  motionMotor,
  realtimeMotor,
};
