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
});

function matrix() {
  return {
    thinking: {
      proto: STATUS.TESTED,
      productionTransformer: STATUS.NOT_IMPLEMENTED,
      liveVerified: false,
      note: "5536-param next-token is not a reasoner; held-out Phase 6 was 0/11",
    },
    hearing: {
      vad: STATUS.CODE_READY,
      stt: STATUS.NOT_IMPLEMENTED,
      liveVerified: false,
      blocked: "no_licensed_speech_dataset",
    },
    speech: {
      protoTone: STATUS.TESTED,
      officialVoice: "REFERENCE_REGISTERED",
      officialTts: STATUS.NOT_IMPLEMENTED,
      realTts: STATUS.NOT_IMPLEMENTED,
      liveVerified: false,
      blocked: "TTS_NOT_TRAINED_FROM_REFERENCE",
    },
    vision: {
      sniff: STATUS.TESTED,
      understand: STATUS.NOT_IMPLEMENTED,
      liveVerified: false,
    },
    memory: {
      isolation: STATUS.TESTED,
      offsiteBackup: STATUS.NOT_IMPLEMENTED,
      liveVerified: false,
    },
    digital_body: {
      pngAvatar: STATUS.TESTED,
      body3d: STATUS.NOT_IMPLEMENTED,
      liveVerified: false,
    },
    motion: {
      timeline: STATUS.CODE_READY,
      lipSync: STATUS.NOT_IMPLEMENTED,
      liveVerified: false,
    },
    realtime: {
      signaling: STATUS.CODE_READY,
      liveMedia: STATUS.NOT_IMPLEMENTED,
      liveVerified: false,
    },
    platform: {
      runtime: STATUS.TESTED,
      councilTextMeeting: STATUS.CODE_READY,
      alwaysOnHost: STATUS.NOT_IMPLEMENTED,
      liveVerified: false,
    },
  };
}

module.exports = { STATUS, matrix };
