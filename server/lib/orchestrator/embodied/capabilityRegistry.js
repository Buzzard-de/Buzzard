const STT = "STT";
const TTS = "TTS";
const REALTIME_AUDIO = "REALTIME_AUDIO";
const REALTIME_VIDEO = "REALTIME_VIDEO";
const AVATAR = "AVATAR";
const LIPSYNC = "LIPSYNC";
const FACIAL_ANIMATION = "FACIAL_ANIMATION";
const BODY_ANIMATION = "BODY_ANIMATION";
const WEBRTC = "WEBRTC";
const TELEPHONY = "TELEPHONY";

function entry(partial) {
  return {
    provider: partial.provider,
    capabilities: partial.capabilities || [],
    supportedInput: partial.supportedInput || [],
    supportedOutput: partial.supportedOutput || [],
    latency: partial.latency || "unknown",
    streaming: Boolean(partial.streaming),
    lipSync: Boolean(partial.lipSync),
    facialAnimation: Boolean(partial.facialAnimation),
    bodyAnimation: Boolean(partial.bodyAnimation),
    WebRTC: Boolean(partial.WebRTC),
    audio: Boolean(partial.audio),
    video: Boolean(partial.video),
    session: Boolean(partial.session),
    authentication: partial.authentication || "api-key",
    health: partial.health || "NOT_CONFIGURED",
    cost: partial.cost || null,
    claimedOnlyIfConfigured: true,
  };
}

const CATALOG = Object.freeze({
  openai: entry({
    provider: "openai",
    capabilities: [STT, TTS, REALTIME_AUDIO],
    supportedInput: ["audio", "text"],
    supportedOutput: ["transcript", "audio"],
    streaming: true,
    audio: true,
    session: true,
    latency: "low",
  }),
  whisper: entry({
    provider: "whisper",
    capabilities: [STT],
    supportedInput: ["audio"],
    supportedOutput: ["transcript"],
    audio: true,
  }),
  deepgram: entry({
    provider: "deepgram",
    capabilities: [STT, REALTIME_AUDIO],
    supportedInput: ["audio"],
    supportedOutput: ["transcript"],
    streaming: true,
    audio: true,
  }),
  elevenlabs: entry({
    provider: "elevenlabs",
    capabilities: [TTS],
    supportedInput: ["text"],
    supportedOutput: ["audio"],
    streaming: true,
    audio: true,
  }),
  azure: entry({
    provider: "azure",
    capabilities: [STT, TTS],
    supportedInput: ["audio", "text"],
    supportedOutput: ["transcript", "audio"],
    audio: true,
  }),
  google: entry({
    provider: "google",
    capabilities: [STT, TTS],
    supportedInput: ["audio", "text"],
    supportedOutput: ["transcript", "audio"],
    audio: true,
  }),
  twilio: entry({
    provider: "twilio",
    capabilities: [TELEPHONY],
    supportedInput: ["phone"],
    supportedOutput: ["call"],
  }),
  telnyx: entry({
    provider: "telnyx",
    capabilities: [TELEPHONY],
    supportedInput: ["phone"],
    supportedOutput: ["call"],
  }),
  webrtc: entry({
    provider: "webrtc",
    capabilities: [WEBRTC],
    WebRTC: true,
    audio: true,
    video: true,
    session: true,
  }),
  generic_avatar: entry({
    provider: "generic_avatar",
    capabilities: [AVATAR, LIPSYNC, FACIAL_ANIMATION, BODY_ANIMATION, REALTIME_VIDEO, WEBRTC],
    supportedInput: ["session", "audio", "animation"],
    supportedOutput: ["video", "audio"],
    streaming: true,
    lipSync: true,
    facialAnimation: true,
    bodyAnimation: true,
    WebRTC: true,
    audio: true,
    video: true,
    session: true,
  }),
});

function declaredAvatarCapabilities() {
  const raw = String(process.env.AVATAR_CAPABILITIES || "")
    .split(",")
    .map((row) => row.trim())
    .filter(Boolean);
  return raw;
}

function resolveAvatarCatalog() {
  const name = String(process.env.AVATAR_PROVIDER || "").toLowerCase();
  if (!name) return { ...CATALOG.generic_avatar, provider: "none", capabilities: [], health: "NOT_CONFIGURED" };
  const declared = declaredAvatarCapabilities();
  if (declared.length) {
    return entry({
      provider: name,
      capabilities: declared,
      lipSync: declared.includes(LIPSYNC),
      facialAnimation: declared.includes(FACIAL_ANIMATION),
      bodyAnimation: declared.includes(BODY_ANIMATION),
      WebRTC: declared.includes(WEBRTC),
      audio: declared.includes(REALTIME_AUDIO) || declared.includes(TTS),
      video: declared.includes(REALTIME_VIDEO) || declared.includes(AVATAR),
      streaming: true,
      session: true,
    });
  }
  if (CATALOG[name]) return { ...CATALOG[name] };
  return { ...CATALOG.generic_avatar, provider: name, capabilities: [AVATAR], bodyAnimation: false };
}

function listCatalog() {
  return CATALOG;
}

module.exports = {
  STT,
  TTS,
  REALTIME_AUDIO,
  REALTIME_VIDEO,
  AVATAR,
  LIPSYNC,
  FACIAL_ANIMATION,
  BODY_ANIMATION,
  WEBRTC,
  TELEPHONY,
  CATALOG,
  listCatalog,
  resolveAvatarCatalog,
  declaredAvatarCapabilities,
};
