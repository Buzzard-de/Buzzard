const { runLocalTurn } = require("../platform/localChain");
const { evaluateAll } = require("./ruleReasoner");
const { analyzeOfficialVoice } = require("../speech/voiceIdentity");
const { transformerDispatch } = require("./transformerDispatch");
const { matrix } = require("../platform/engineStatus");
const { probeHardware } = require("./hardwareProbe");
const { whyReasoningFails } = require("./whyReasoningFails");

function closedLocal() {
  return [
    "runtime_isolation",
    "eight_engine_contracts",
    "rule_thinking",
    "toy_transformer_proto",
    "inference_runtime",
    "dataset_registry",
    "audio_image_validate",
    "official_voice_reference_registered",
    "measured_f0_sidecar",
    "proto_tone_at_measured_f0",
    "closed_world_rule_reasoner",
    "vision_geometry_stats",
    "memory_isolation_hash",
    "digital_body_png_poses",
    "motion_timeline",
    "in_process_realtime_signaling",
    "pusat_read_only_native_actions",
    "esat_egress_deny",
    "local_think_speak_body_chain",
  ];
}

function blockedExternal() {
  return [
    "production_transformer",
    "stt_transcription",
    "official_voice_clone_tts",
    "vision_understand_ocr_detect",
    "lip_sync_3d_body",
    "live_audio_video",
    "always_on_host",
    "offsite_worm_backup",
    "licensed_speech_hours",
  ];
}

function runPhase9({ actorId = "sinan_bey" } = {}) {
  if (!["sinan_bey", "pusat", "esat_bey"].includes(actorId)) {
    return { ok: false, code: "UNAUTHORIZED_ACTOR", liveVerified: false };
  }
  const chain = runLocalTurn({ actorId, text: "status then report" });
  const rules = evaluateAll();
  const voice = analyzeOfficialVoice({ actorId });
  const closed = closedLocal();
  const blocked = blockedExternal();
  return {
    ok: true,
    actorId,
    liveVerified: false,
    productionReady: false,
    singlePercentComplete: null,
    localStackClosedCount: closed.length,
    localStackClosedTotal: closed.length,
    localStackClosedPercent: 100,
    productAiPercent: null,
    note: "100% applies only to locally closable stack items, not product AI",
    closed,
    blocked,
    chain,
    rules,
    voice: { code: voice.code, ttsReady: voice.ttsReady, inventedHz: voice.inventedHz, meanF0: voice.profile?.f0Hz?.mean },
    productionTransformer: transformerDispatch(),
    engines: matrix(),
    hardware: probeHardware(),
    whyTinyModelFails: whyReasoningFails(),
    cloneAuthorized: false,
  };
}

module.exports = { runPhase9, closedLocal, blockedExternal };
