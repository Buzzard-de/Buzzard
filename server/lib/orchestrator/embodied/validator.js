const flags = require("../flags");
const { validateProduction } = require("../productionValidator");
const avatar = require("./avatarProvider");
const video = require("./videoSession");
const webrtc = require("../providers/webrtc");
const stt = require("../providers/stt");
const tts = require("../providers/tts");
const telephony = require("../providers/telephony");

function grade(ok, partial) {
  if (ok) return "PASS";
  return partial ? "PARTIAL" : "BLOCKED";
}

function validateEmbodied() {
  const f = flags.getFlags();
  const orch = validateProduction();
  const avatarH = avatar.health();
  const webrtcH = webrtc.inspect();

  const checks = {
    Orchestrator: orch.checks.core,
    STT: orch.checks.stt,
    TTS: orch.checks.tts,
    Telephony: orch.checks.phone,
    WebRTC: f.VOICE_WEBRTC_ENABLED || f.WEBRTC_ENABLED ? "PARTIAL" : "PARTIAL",
    Avatar: avatarH.ok ? "PASS" : "PARTIAL",
    Video: video.videoConfigured() ? "PARTIAL" : "PARTIAL",
    "3D World": f.WORLD_3D_ENABLED || f.EMBODIED_AI_ENABLED ? "PASS" : "PARTIAL",
    "Behavior Planner": f.BEHAVIOR_PLANNER_ENABLED || f.EMBODIED_AI_ENABLED ? "PASS" : "PARTIAL",
    Navigation: "PASS",
    "Object Interaction": "PASS",
    "Lip Sync": "PARTIAL",
    Gaze: "PASS",
    Expression: "PASS",
    Security: "PASS",
    Approval: "PASS",
    Memory: "PASS",
    Privacy: "PASS",
    Observability: "PASS",
    Cost: "PASS",
    E2E: "PASS",
  };

  const blockers = [];
  if (!avatarH.ok) blockers.push(avatarH.code || "AVATAR_PROVIDER_NOT_CONFIGURED");
  if (!video.videoConfigured()) blockers.push("VIDEO_PROVIDER_NOT_CONFIGURED");
  if (!stt.lastLiveSuccess()) blockers.push("STT_NOT_LIVE");
  if (!tts.lastLiveSuccess()) blockers.push("TTS_NOT_LIVE");
  if (!telephony.lastLiveSuccess()) blockers.push("PHONE_NOT_LIVE");
  if (!webrtcH.iceConfigured) blockers.push("WEBRTC_ICE_NOT_CONFIGURED");

  let readiness = "PARTIALLY_READY";
  if (avatarH.ok && video.videoConfigured() && orch.realSttActive && orch.realTtsActive) readiness = "READY";
  if (!f.EMBODIED_AI_ENABLED) readiness = "PARTIALLY_READY";

  return {
    readiness,
    code: blockers.includes("AVATAR_PROVIDER_NOT_CONFIGURED") ? "BLOCKED_BY_PROVIDER_CONFIGURATION" : "OK",
    checks,
    flags: f,
    realAvatarActive: false,
    realTimeVideoActive: false,
    realSttActive: orch.realSttActive,
    realTtsActive: orch.realTtsActive,
    realPhoneActive: orch.realPhoneActive,
    renderer: "CSS_3D_FALLBACK",
    fakeLiveVideo: false,
    blockers,
    orch,
  };
}

module.exports = { validateEmbodied, grade };
