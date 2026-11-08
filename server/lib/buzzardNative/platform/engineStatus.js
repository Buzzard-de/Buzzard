/**
 * Honest per-engine status. Not a single fake completion percentage.
 */
const STATUS = Object.freeze({
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  CODE_READY: "CODE_READY",
  TESTED: "TESTED",
  INTEGRATED: "INTEGRATED",
  LIVE_VERIFIED: "LIVE_VERIFIED",
  PRODUCTION_READY: "PRODUCTION_READY",
  BLOCKED: "BLOCKED",
  NOT_IMPLEMENTED: "NOT_IMPLEMENTED",
  PARTIAL: "PARTIAL",
});

function matrix() {
  return {
    thinking: {
      proto: STATUS.TESTED,
      ruleReasoner: STATUS.TESTED,
      structuredInference: STATUS.TESTED,
      productionTransformer: STATUS.NOT_IMPLEMENTED,
      liveVerified: false,
      note: "RULE_BASED structured inference; not LLM_COMPLETED; Phase 6 tiny held-out 0/11",
    },
    hearing: {
      vad: STATUS.CODE_READY,
      frames: STATUS.CODE_READY,
      toneCodecStt: STATUS.TESTED,
      stt: STATUS.NOT_IMPLEMENTED,
      liveVerified: false,
      blocked: "no_licensed_speech_dataset",
    },
    speech: {
      protoTone: STATUS.TESTED,
      officialVoice: "REFERENCE_REGISTERED",
      measuredF0: STATUS.TESTED,
      ttsArchitecture: STATUS.CODE_READY,
      officialTts: STATUS.NOT_IMPLEMENTED,
      realTts: STATUS.NOT_IMPLEMENTED,
      liveVerified: false,
      blocked: "cloneAuthorized_false",
    },
    vision: {
      sniff: STATUS.TESTED,
      geometry: STATUS.CODE_READY,
      bitmapOcr: STATUS.TESTED,
      blobDetect: STATUS.TESTED,
      understand: STATUS.NOT_IMPLEMENTED,
      liveVerified: false,
    },
    memory: {
      isolation: STATUS.TESTED,
      localSnapshot: STATUS.TESTED,
      offsiteBackup: STATUS.NOT_IMPLEMENTED,
      liveVerified: false,
    },
    digital_body: {
      pngAvatar: STATUS.TESTED,
      voiceBind: STATUS.CODE_READY,
      visemeTimeline: STATUS.CODE_READY,
      body3d: STATUS.NOT_IMPLEMENTED,
      liveVerified: false,
    },
    motion: {
      timeline: STATUS.CODE_READY,
      visemeSchedule: STATUS.TESTED,
      lipSync: STATUS.NOT_IMPLEMENTED,
      liveVerified: false,
    },
    realtime: {
      signaling: STATUS.CODE_READY,
      inProcessPackets: STATUS.TESTED,
      liveMedia: STATUS.NOT_IMPLEMENTED,
      liveVerified: false,
    },
    platform: {
      runtime: STATUS.TESTED,
      councilTextMeeting: STATUS.CODE_READY,
      supervisorInProcess: STATUS.TESTED,
      alwaysOnHost: STATUS.NOT_IMPLEMENTED,
      liveVerified: false,
    },
  };
}

module.exports = { STATUS, matrix };
