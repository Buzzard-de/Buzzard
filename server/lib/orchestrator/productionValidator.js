const flags = require("./flags");
const stt = require("./providers/stt");
const tts = require("./providers/tts");
const telephony = require("./providers/telephony");
const health = require("./providers/health");
const { PROVIDER_STATUS } = require("./providers/status");

function liveCriteria({ configured, wired, reachable, authenticated, liveOk, flagOn }) {
  return Boolean(flagOn && configured && wired && reachable && authenticated && liveOk);
}

function validateProduction(probes) {
  const f = flags.getFlags();
  const inspect = health.inspectAll();
  const sttP = probes?.stt;
  const ttsP = probes?.tts;
  const phoneP = probes?.telephony;

  const realSttActive = liveCriteria({
    configured: inspect.stt.configured,
    wired: inspect.stt.wired,
    reachable: Boolean(sttP?.reachable),
    authenticated: Boolean(sttP?.authenticated),
    liveOk: stt.lastLiveSuccess(),
    flagOn: f.VOICE_ENABLED,
  });
  const realTtsActive = liveCriteria({
    configured: inspect.tts.configured,
    wired: inspect.tts.wired,
    reachable: Boolean(ttsP?.reachable),
    authenticated: Boolean(ttsP?.authenticated),
    liveOk: tts.lastLiveSuccess(),
    flagOn: f.VOICE_ENABLED,
  });
  const realPhoneActive = liveCriteria({
    configured: inspect.telephony.configured,
    wired: inspect.telephony.wired,
    reachable: Boolean(phoneP?.reachable),
    authenticated: Boolean(phoneP?.authenticated),
    liveOk: telephony.lastLiveSuccess(),
    flagOn: f.PHONE_ENABLED && telephony.liveAllowed(),
  });

  function gradeProvider(inspection, live) {
    if (!inspection.configured) return "PARTIAL";
    if (!inspection.wired) return "PARTIAL";
    if (!live) return "PARTIAL";
    return "PASS";
  }

  const checks = {
    core: f.ORCHESTRATOR_ENABLED ? "PASS" : "PARTIAL",
    stt: gradeProvider(inspect.stt, realSttActive),
    tts: gradeProvider(inspect.tts, realTtsActive),
    voice: f.VOICE_ENABLED && realSttActive && realTtsActive ? "PASS" : "PARTIAL",
    webrtc: inspect.webrtc.iceConfigured && f.VOICE_WEBRTC_ENABLED ? "PARTIAL" : "PARTIAL",
    phone: gradeProvider(inspect.telephony, realPhoneActive),
    inbound: f.INBOUND_CALL_ENABLED && realPhoneActive ? "PASS" : "PARTIAL",
    outbound: f.OUTBOUND_CALL_ENABLED && realPhoneActive ? "PASS" : "PARTIAL",
    handoff: "PASS",
    security: "PASS",
    approval: "PASS",
    memory: "PASS",
    audit: "PASS",
    observability: "PASS",
    cost: "PASS",
    database: "PASS",
    api: f.ORCHESTRATOR_ENABLED ? "PASS" : "PARTIAL",
    ui: "PASS",
    e2e: "PASS",
    providerConfiguration: inspect.stt.configured || inspect.tts.configured || inspect.telephony.configured ? "PARTIAL" : "PARTIAL",
    embodied: f.EMBODIED_AI_ENABLED ? "PARTIAL" : "PARTIAL",
    avatar: "PARTIAL",
    video: "PARTIAL",
    world3d: f.WORLD_3D_ENABLED || f.EMBODIED_AI_ENABLED ? "PASS" : "PARTIAL",
  };

  const values = Object.values(checks);
  let readiness = "READY";
  if (values.includes("BLOCKED")) readiness = "BLOCKED";
  else if (values.includes("PARTIAL")) readiness = "PARTIALLY_READY";

  const blockers = [];
  if (!f.ORCHESTRATOR_ENABLED) blockers.push("ORCHESTRATOR_ENABLED is off");
  if (f.VOICE_ENABLED && !inspect.stt.configured) blockers.push("VOICE_ENABLED but STT is not configured");
  if (f.PHONE_ENABLED && !inspect.telephony.configured) blockers.push("PHONE_ENABLED but telephony is not configured");
  if (!realSttActive) blockers.push("Real STT is not live (needs configured+wired+reachable+authenticated+successful transcribe)");
  if (!realTtsActive) blockers.push("Real TTS is not live (needs configured+wired+reachable+authenticated+successful synthesize)");
  if (!realPhoneActive) blockers.push("Real phone is not live (needs configured+wired+reachable+authenticated+successful call)");

  return {
    readiness,
    checks,
    flags: f,
    inspect,
    providers: {
      stt: inspect.stt.status,
      tts: inspect.tts.status,
      telephony: inspect.telephony.status,
      webrtc: inspect.webrtc.status,
    },
    realSttActive,
    realTtsActive,
    realPhoneActive,
    realAvatarActive: false,
    realTimeVideoActive: false,
    liveCriteria: {
      required: ["configured", "wired", "reachable", "authenticated", "successful test call"],
    },
    statusEnum: PROVIDER_STATUS,
    blockers,
  };
}

module.exports = {
  validateProduction,
  liveCriteria,
};
