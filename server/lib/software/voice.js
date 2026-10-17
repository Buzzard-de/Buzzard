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

function mockSession(input = {}) {
  const config = validateConfig(input);
  if (!config.ok) return { ...config, live: false, callStarted: false, mediaOpen: false };
  return {
    ok: true,
    mock: true,
    live: false,
    callStarted: false,
    mediaOpen: false,
    webrtcConnected: false,
    adapter: config.adapter,
    note: "Mock session only. No Twilio, Realtime, or TURN connection is opened.",
  };
}

function iceConfig() {
  return {
    ok: true,
    live: false,
    connected: false,
    stunPresent: Boolean(process.env.WEBRTC_STUN_URL),
    turnPresent: Boolean(process.env.WEBRTC_TURN_URL),
    signalingPresent: Boolean(process.env.WEBRTC_SIGNALING_URL),
    urlsExposed: false,
    note: "Presence-only ICE/TURN/STUN flags. URLs are not returned and no peer connection is opened.",
  };
}

function sttTranscribe() {
  const status = adapterStatus("stt");
  return {
    ok: false,
    live: false,
    transcript: null,
    reason: status.configured ? "STT_LIVE_BLOCKED" : "STT_NOT_CONFIGURED",
    callStarted: false,
  };
}

function ttsSpeak() {
  const status = adapterStatus("tts");
  return {
    ok: false,
    live: false,
    audio: null,
    reason: status.configured ? "TTS_LIVE_BLOCKED" : "TTS_NOT_CONFIGURED",
    callStarted: false,
  };
}

function webrtcSignal() {
  return {
    ok: false,
    live: false,
    webrtcConnected: false,
    mediaOpen: false,
    ice: iceConfig(),
    reason: "WEBRTC_SIGNALING_BLOCKED",
  };
}

function realtimeSession() {
  const status = adapterStatus("realtime");
  return {
    ok: false,
    live: false,
    callStarted: false,
    reason: status.configured ? "REALTIME_LIVE_BLOCKED" : "REALTIME_NOT_CONFIGURED",
    note: "OPENAI_API_KEY presence is not a live Realtime session.",
  };
}

function digitalHumanSession() {
  const status = adapterStatus("digital_human");
  return {
    ok: false,
    live: false,
    videoOpen: false,
    reason: status.configured ? "DIGITAL_HUMAN_LIVE_BLOCKED" : "DIGITAL_HUMAN_NOT_CONFIGURED",
  };
}

function handoffToPusat(input = {}) {
  return routeTextTask({ ...input, pusat: true });
}

function startCall() {
  return {
    ok: false,
    live: false,
    callStarted: false,
    mediaOpen: false,
    sid: null,
    reason: "CALL_START_BLOCKED",
    note: "Twilio SID/token presence does not place a call.",
  };
}

function inboundWebhook() {
  return {
    ok: false,
    live: false,
    callStarted: false,
    mediaOpen: false,
    answered: false,
    reason: "TWILIO_INBOUND_BLOCKED",
    note: "Inbound telephony webhooks are not executed. No media stream is opened.",
  };
}

function confirmLiveCall() {
  return {
    ok: false,
    live: false,
    liveVerified: false,
    callStarted: false,
    reason: "LIVE_CALL_NOT_CONFIGURED",
    note: "BUZZARD_VOICE_LIVE_PROBE does not open a paid media session.",
  };
}

function health() {
  const adapters = listAdapters();
  return {
    codeReady: true,
    liveReady: false,
    liveVerified: false,
    anyLive: false,
    callStarted: false,
    twilioLive: false,
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
  handoffToPusat,
  mockSession,
  iceConfig,
  sttTranscribe,
  ttsSpeak,
  webrtcSignal,
  realtimeSession,
  digitalHumanSession,
  startCall,
  inboundWebhook,
  confirmLiveCall,
  health,
};
