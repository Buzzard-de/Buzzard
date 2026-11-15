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
  return {
    status: missing.length ? "BLOCKED" : "CODE_READY",
    missing,
    webrtcCode: true,
    liveCalls: false,
    conferences: false,
    note: missing.length
      ? "No SIP number, STT, or TTS account is configured. Do not claim voice calling works."
      : "Credentials present locally — still needs a live call test before COMPLETE.",
  };
}

module.exports = { REQUIRED_ENV, assessVoice };
