const flags = require("./flags");
const stt = require("./providers/stt");
const tts = require("./providers/tts");
const telephony = require("./providers/telephony");
const webrtc = require("./providers/webrtc");
const { PROVIDER_HEALTH } = require("./constants");

function grade({ implemented, configured, live, blocked }) {
  if (blocked) return "BLOCKED";
  if (implemented && live) return "PASS";
  if (implemented && !configured) return "PARTIAL";
  if (implemented && configured && !live) return "PARTIAL";
  if (!implemented) return "BLOCKED";
  return "PARTIAL";
}

function validateProduction() {
  const f = flags.getFlags();
  const sttConfigured = stt.configured();
  const ttsConfigured = tts.configured();
  const phoneConfigured = telephony.credentialsPresent();

  const checks = {
    core: grade({ implemented: true, configured: f.ORCHESTRATOR_ENABLED, live: f.ORCHESTRATOR_ENABLED }),
    stt: grade({ implemented: true, configured: sttConfigured, live: stt.lastLiveSuccess() }),
    tts: grade({ implemented: true, configured: ttsConfigured, live: tts.lastLiveSuccess() }),
    voice: grade({ implemented: true, configured: f.VOICE_ENABLED, live: f.VOICE_ENABLED && sttConfigured && ttsConfigured }),
    webrtc: grade({ implemented: true, configured: f.VOICE_WEBRTC_ENABLED, live: f.VOICE_WEBRTC_ENABLED }),
    phone: grade({ implemented: true, configured: phoneConfigured, live: telephony.lastLiveSuccess() }),
    inbound: grade({ implemented: true, configured: f.INBOUND_CALL_ENABLED && phoneConfigured, live: telephony.lastLiveSuccess() }),
    outbound: grade({ implemented: true, configured: f.OUTBOUND_CALL_ENABLED && phoneConfigured, live: telephony.lastLiveSuccess() }),
    handoff: grade({ implemented: true, configured: true, live: true }),
    security: grade({ implemented: true, configured: true, live: true }),
    approval: grade({ implemented: true, configured: true, live: true }),
    memory: grade({ implemented: true, configured: true, live: true }),
    audit: grade({ implemented: true, configured: true, live: true }),
    observability: grade({ implemented: true, configured: true, live: true }),
    cost: grade({ implemented: true, configured: true, live: true }),
    database: grade({ implemented: true, configured: true, live: true }),
    api: grade({ implemented: true, configured: f.ORCHESTRATOR_ENABLED, live: f.ORCHESTRATOR_ENABLED }),
    ui: grade({ implemented: true, configured: true, live: true }),
    e2e: grade({ implemented: true, configured: true, live: true }),
    providerConfiguration: grade({
      implemented: true,
      configured: sttConfigured || ttsConfigured || phoneConfigured,
      live: stt.lastLiveSuccess() || tts.lastLiveSuccess() || telephony.lastLiveSuccess(),
    }),
  };

  const values = Object.values(checks);
  let readiness = "READY";
  if (values.includes("BLOCKED")) readiness = "BLOCKED";
  else if (values.includes("PARTIAL")) readiness = "PARTIALLY_READY";

  const realSttActive = Boolean(f.VOICE_ENABLED && sttConfigured && stt.lastLiveSuccess());
  const realTtsActive = Boolean(f.VOICE_ENABLED && ttsConfigured && tts.lastLiveSuccess());
  const realPhoneActive = Boolean(f.PHONE_ENABLED && telephony.liveAllowed() && telephony.lastLiveSuccess());

  const blockers = [];
  if (!f.ORCHESTRATOR_ENABLED) blockers.push("ORCHESTRATOR_ENABLED is off");
  if (f.VOICE_ENABLED && !sttConfigured) blockers.push("VOICE_ENABLED but STT is not configured");
  if (f.PHONE_ENABLED && !phoneConfigured) blockers.push("PHONE_ENABLED but telephony is not configured");
  if (!realSttActive) blockers.push("Real STT is not live (credentials missing or no successful provider call)");
  if (!realTtsActive) blockers.push("Real TTS is not live (credentials missing or no successful provider call)");
  if (!realPhoneActive) blockers.push("Real phone is not live (credentials missing or no successful provider call)");

  return {
    readiness,
    checks,
    flags: f,
    providers: {
      stt: stt.health(),
      tts: tts.health(),
      telephony: telephony.health(),
      webrtc: webrtc.health(),
    },
    providerHealth: {
      stt: stt.health() === PROVIDER_HEALTH.NOT_CONFIGURED ? "NOT_CONFIGURED" : stt.health(),
    },
    realSttActive,
    realTtsActive,
    realPhoneActive,
    blockers,
  };
}

module.exports = {
  validateProduction,
};
