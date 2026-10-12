/**
 * Voice / phone / digital-human adapters.
 * Code-level interface only. Live media stays BLOCKED without credentials and probe.
 */

const { VOICE_ADAPTERS } = require("./constants");

const ENV_HINTS = Object.freeze({
  twilio: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"],
  stt: ["OPENAI_API_KEY", "DEEPGRAM_API_KEY"],
  tts: ["OPENAI_API_KEY", "ELEVENLABS_API_KEY"],
  webrtc: ["WEBRTC_SIGNALING_URL"],
  realtime: ["OPENAI_API_KEY"],
  digital_human: ["DIGITAL_HUMAN_ENDPOINT"],
});

function envPresent(names) {
  return names.some((name) => Boolean(process.env[name]));
}

function adapterStatus(id) {
  const hints = ENV_HINTS[id] || [];
  const configured = envPresent(hints);
  const liveProbe = process.env.BUZZARD_VOICE_LIVE_PROBE === "1";
  return {
    id,
    interfaceReady: true,
    configured,
    live: false,
    blocked: true,
    probed: false,
    liveVerified: false,
    callStarted: false,
    note: liveProbe && configured
      ? "Probe flag set but this slice never opens a live media session."
      : "LIVE BLOCKED — missing credentials or probe disabled.",
  };
}

function listAdapters() {
  return VOICE_ADAPTERS.map(adapterStatus);
}

function validateConfig(input = {}) {
  const adapter = input.adapter || "twilio";
  if (!VOICE_ADAPTERS.includes(adapter)) {
    return { ok: false, adapter, reason: "UNKNOWN_ADAPTER" };
  }
  const timeoutMs = Number(input.timeoutMs ?? 10_000);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 60_000) {
    return { ok: false, adapter, reason: "INVALID_TIMEOUT" };
  }
  return { ok: true, adapter, timeoutMs, live: false };
}

function routeTextTask(input = {}) {
  return {
    ok: true,
    routed: true,
    live: false,
    callStarted: false,
    pusat: true,
    text: input.text || null,
    note: "Text/task routing only. No phone call is placed.",
  };
}

function health() {
  const adapters = listAdapters();
  return {
    codeReady: true,
    liveReady: false,
    liveVerified: false,
    anyLive: false,
    adapters,
  };
}

function requiredEnv(id) {
  return ENV_HINTS[id] ? [...ENV_HINTS[id]] : [];
}

module.exports = {
  adapterStatus,
  listAdapters,
  requiredEnv,
  validateConfig,
  routeTextTask,
  health,
};
