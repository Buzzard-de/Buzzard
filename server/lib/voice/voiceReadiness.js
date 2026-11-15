/**
 * Voice / telephony readiness. Missing SIP/STT/TTS credentials stay BLOCKED.
 */
const REQUIRED_ENV = Object.freeze([
  "BUZZARD_SIP_URI",
  "BUZZARD_SIP_USER",
  "BUZZARD_SIP_PASSWORD",
  "BUZZARD_STT_ENDPOINT",
  "BUZZARD_TTS_ENDPOINT",
]);

function assessVoice() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  const sipMissing = missing.some((key) => key.startsWith("BUZZARD_SIP_"));
  return {
    status: missing.length ? "BLOCKED" : "CODE_READY",
    missing,
    webrtcCode: true,
    liveCalls: false,
    conferences: false,
    voice: missing.length ? "NOT_CONFIGURED" : "UNKNOWN",
    stt: missing.includes("BUZZARD_STT_ENDPOINT") ? "NOT_CONFIGURED" : "UNKNOWN",
    tts: missing.includes("BUZZARD_TTS_ENDPOINT") ? "NOT_CONFIGURED" : "UNKNOWN",
    phone: sipMissing ? "NOT_CONFIGURED" : "UNKNOWN",
    liveNetwork: "NOT_CONFIGURED",
    reachable: false,
    codeReadyIsLive: false,
    note: missing.length
      ? "No SIP number, STT, or TTS account is configured. Do not claim voice calling works."
      : "Credentials present locally — still needs a live call test before COMPLETE.",
  };
}

module.exports = { REQUIRED_ENV, assessVoice };
