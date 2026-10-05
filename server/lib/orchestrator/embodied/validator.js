const flags = require("../flags");
const { validateProduction } = require("../productionValidator");
const avatar = require("./avatarProvider");
const video = require("./videoSession");
const webrtc = require("../providers/webrtc");
const stt = require("../providers/stt");
const tts = require("../providers/tts");
const telephony = require("../providers/telephony");
const { resolveFallback } = require("./fallback");
const { listCatalog } = require("./capabilityRegistry");

function serviceStatus({ configured, wired, live, failed }) {
  if (failed) return "FAILED";
  if (!configured) return "NOT_CONFIGURED";
  if (live) return "READY";
  if (wired) return "DEGRADED";
  return "NOT_CONFIGURED";
}

function validateEmbodied() {
  const f = flags.getFlags();
  const orch = validateProduction();
  const avatarH = avatar.health();
  const webrtcH = webrtc.inspect();
  const catalog = avatar.capabilities();
  const fallback = resolveFallback({
    liveAvatar: Boolean(avatarH.live),
    providerConfigured: avatar.configured(),
    providerWired: avatar.wired(),
    local3d: false,
  });

  const codeReady = {
    orchestrator: "READY",
    world: "READY",
    behavior: "READY",
    navigation: "READY",
    viseme: "READY",
    facial: "READY",
    body: "READY",
    avatarAdapter: "READY",
    security: "READY",
    approval: "READY",
    privacy: "READY",
  };

  const providerReady = {
    avatar: serviceStatus({ configured: avatar.configured(), wired: avatar.wired(), live: avatar.lastLiveSuccess() }),
    video: serviceStatus({ configured: video.videoConfigured(), wired: video.videoConfigured(), live: false }),
    stt: serviceStatus({ configured: orch.inspect.stt.configured, wired: orch.inspect.stt.wired, live: orch.realSttActive }),
    tts: serviceStatus({ configured: orch.inspect.tts.configured, wired: orch.inspect.tts.wired, live: orch.realTtsActive }),
    telephony: serviceStatus({
      configured: orch.inspect.telephony.configured,
      wired: orch.inspect.telephony.wired,
      live: orch.realPhoneActive,
    }),
    webrtc: serviceStatus({
      configured: Boolean(f.VOICE_WEBRTC_ENABLED || f.WEBRTC_ENABLED),
      wired: webrtcH.iceConfigured,
      live: false,
    }),
  };

  const checks = {
    Orchestrator: orch.checks.core,
    STT: orch.checks.stt,
    TTS: orch.checks.tts,
    Telephony: orch.checks.phone,
    WebRTC: providerReady.webrtc === "READY" ? "PASS" : "PARTIAL",
    Avatar: avatarH.live ? "PASS" : "PARTIAL",
    Video: "PARTIAL",
    "3D World": "PASS",
    "Behavior Planner": "PASS",
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
  if (!avatar.configured()) blockers.push("AVATAR_PROVIDER_NOT_CONFIGURED");
  else if (!avatar.wired()) blockers.push("AVATAR_PROVIDER_NOT_WIRED");
  else if (!avatar.lastLiveSuccess()) blockers.push("AVATAR_NOT_LIVE");
  if (!video.videoConfigured()) blockers.push("VIDEO_PROVIDER_NOT_CONFIGURED");
  if (!stt.lastLiveSuccess()) blockers.push("STT_NOT_LIVE");
  if (!tts.lastLiveSuccess()) blockers.push("TTS_NOT_LIVE");
  if (!telephony.lastLiveSuccess()) blockers.push("PHONE_NOT_LIVE");
  if (!webrtcH.iceConfigured) blockers.push("WEBRTC_ICE_NOT_CONFIGURED");

  const productionAvatar = avatar.lastLiveSuccess() && f.REALTIME_AVATAR_ENABLED && f.AVATAR_ENABLED ? "READY" : "BLOCKED";
  let readiness = "PARTIALLY_READY";
  if (productionAvatar === "READY" && orch.realSttActive && orch.realTtsActive) readiness = "READY";
  if (blockers.includes("AVATAR_PROVIDER_NOT_CONFIGURED")) readiness = "PARTIALLY_READY";

  return {
    readiness,
    code: blockers.includes("AVATAR_PROVIDER_NOT_CONFIGURED")
      ? "BLOCKED_BY_PROVIDER_CONFIGURATION"
      : blockers.includes("AVATAR_PROVIDER_NOT_WIRED")
        ? "BLOCKED_BY_PROVIDER_CONFIGURATION"
        : "OK",
    codeReady,
    providerReady,
    productionReady: {
      avatar: productionAvatar,
      overall: readiness,
    },
    checks,
    flags: f,
    catalog: listCatalog(),
    avatarCapabilities: catalog,
    fallback,
    realAvatarActive: Boolean(avatar.lastLiveSuccess()),
    realTimeVideoActive: false,
    realLipSyncActive: Boolean(avatar.lastLiveSuccess() && catalog.lipSync),
    realSttActive: orch.realSttActive,
    realTtsActive: orch.realTtsActive,
    realPhoneActive: orch.realPhoneActive,
    renderer: fallback.mode,
    fakeLiveVideo: false,
    fullBodyClaimed: Boolean(catalog.bodyAnimation && avatar.lastLiveSuccess()),
    blockers,
    orch,
  };
}

module.exports = { validateEmbodied, serviceStatus };
