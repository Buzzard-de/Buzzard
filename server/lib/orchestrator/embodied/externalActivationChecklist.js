const { discoverCredentials } = require("./credentialDiscovery");

function item(service, environment, account, api) {
  return { service, environment, account, api };
}

function externalActivationChecklist() {
  const creds = discoverCredentials();
  return {
    code: "BLOCKED_BY_PROVIDER_CONFIGURATION",
    credentials: creds.keys,
    avatar: item(
      "Streaming avatar/video session API (HTTPS) compatible with avatarProvider generic adapter",
      ["AVATAR_PROVIDER", "AVATAR_API_KEY", "AVATAR_BASE_URL"],
      "Vendor account with a professional streaming avatar (not a photoreal impersonation of a real person)",
      "Authenticated session create / start / heartbeat / interrupt / close"
    ),
    stt: item(
      "Streaming speech-to-text already wired: openai/whisper, deepgram, azure, or google",
      ["STT_PROVIDER", "STT_API_KEY or OPENAI_API_KEY / DEEPGRAM_API_KEY / AZURE_SPEECH_KEY / GOOGLE_STT_KEY", "optional STT_BASE_URL"],
      "Speech API project with TR/DE/EN/AR",
      "Streaming and batch transcribe + language detection"
    ),
    tts: item(
      "Streaming text-to-speech already wired: openai, elevenlabs, azure, or google",
      ["TTS_PROVIDER", "TTS_API_KEY or OPENAI_API_KEY / ELEVENLABS_API_KEY / AZURE_SPEECH_KEY / GOOGLE_TTS_KEY", "optional TTS_BASE_URL"],
      "Voice API project with TR/DE/EN/AR voices",
      "Streaming synthesize + cancel/interrupt"
    ),
    webrtc: {
      STUN: "WEBRTC_STUN_URL (public STUN, e.g. stun:stun.l.google.com:19302 or your own)",
      TURN: "WEBRTC_TURN_URL (TURN required for production NAT traversal)",
      credential: ["WEBRTC_TURN_USERNAME", "WEBRTC_TURN_CREDENTIAL"],
      note: "Signaling code exists. WEBRTC_MEDIA_ACTIVE requires ICE + real audio/video tracks.",
    },
    phone: item(
      "Telephony already wired: twilio, telnyx, vonage, or plivo",
      [
        "TELEPHONY_PROVIDER",
        "TELEPHONY_ACCOUNT_SID or TWILIO_ACCOUNT_SID",
        "TELEPHONY_AUTH_TOKEN or TWILIO_AUTH_TOKEN / TELNYX_API_KEY",
        "TELEPHONY_WEBHOOK_SECRET",
        "optional TELEPHONY_BASE_URL / TELEPHONY_VOICE_URL / TELEPHONY_STATUS_URL",
      ],
      "Number-enabled telephony account",
      "Inbound/outbound webhooks with signature validation, replay protection, STT/TTS, human handoff"
    ),
    architectureCompatible: {
      stt: ["openai", "whisper", "deepgram", "azure", "google"],
      tts: ["openai", "elevenlabs", "azure", "google"],
      phone: ["twilio", "telnyx", "vonage", "plivo"],
      avatar: ["generic HTTPS AVATAR_BASE_URL via existing avatarProvider"],
      doNotAddUnlessPresent: ["Three.js", "Babylon", "Ready Player Me runtime", "LiveKit", "Agora", "Daily"],
    },
    flagsRemainOffUntilLiveCriteria: [
      "AVATAR_ENABLED",
      "REALTIME_AVATAR_ENABLED",
      "VOICE_ENABLED",
      "WEBRTC_ENABLED",
      "PHONE_ENABLED",
    ],
  };
}

module.exports = { externalActivationChecklist };
