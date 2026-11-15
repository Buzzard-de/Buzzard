/**
 * Council voice / 24-7 phone framework. Live calls stay off without provider proof.
 */
const { getMember } = require("../pusat/council");

function assessVoice() {
  return {
    stt: false,
    tts: false,
    sip: false,
    twilio: false,
    verifiedNumber: false,
    stunTurn: false,
    liveCalls: false,
    voiceAsAuth: false,
    e2eAudioTested: false,
    voice: "NOT_CONFIGURED",
    sttStatus: "NOT_CONFIGURED",
    ttsStatus: "NOT_CONFIGURED",
    phone: "NOT_CONFIGURED",
    liveNetwork: "NOT_CONFIGURED",
    codeStatus: "CODE_READY",
    status: "NOT_CONFIGURED",
    reachable: false,
    codeReadyIsLive: false,
    completeClaim: false,
  };
}

function authorizeOutbound({ actorId, destination, purpose, userAuthorized = false } = {}) {
  if (!userAuthorized) return { ok: false, code: "USER_AUTHORIZATION_REQUIRED", placed: false };
  if (!getMember(actorId)) return { ok: false, code: "UNKNOWN_ACTOR", placed: false };
  if (!destination || !purpose) return { ok: false, code: "INCOMPLETE", placed: false };
  return {
    ok: false,
    placed: false,
    code: "PROVIDER_NOT_CONFIGURED",
    destination,
    purpose,
    liveCalls: false,
  };
}

function scheduleCouncilMeeting({ chair = "pusat", minuteTaker = "nesrin_hanim" } = {}) {
  if (chair !== "pusat") return { ok: false, code: "CHAIR_MUST_BE_PUSAT" };
  return {
    ok: true,
    liveVoice: false,
    transcript: [],
    minutesOwner: minuteTaker,
    status: "SCHEDULED_TEXT_ONLY",
  };
}

function escalateIncident({ severity, quietHours = false } = {}) {
  if (severity === "critical") {
    return { notify: true, channel: "alternate_then_phone", liveCallPlaced: false, loopGuard: true };
  }
  if (quietHours) return { notify: false, reason: "QUIET_HOURS", liveCallPlaced: false };
  return { notify: true, channel: "in_app", liveCallPlaced: false };
}

function envPresent(name) {
  return Boolean(process.env[name]);
}

function adapter(id, { codePresent, credentialNames = [], blocked = false }) {
  const credentialPresent = credentialNames.some((name) => envPresent(name));
  return {
    id,
    configured: credentialPresent,
    codePresent,
    serviceConnected: false,
    status: credentialPresent ? "UNKNOWN" : blocked ? "BLOCKED" : "NOT_CONFIGURED",
    live: false,
    credentialInvented: false,
  };
}

function providerAdapters() {
  return [
    adapter("stt", { codePresent: true, credentialNames: ["BUZZARD_STT_ENDPOINT"] }),
    adapter("tts", { codePresent: true, credentialNames: ["BUZZARD_TTS_ENDPOINT"] }),
    adapter("webrtc", { codePresent: true }),
    adapter("stun_turn", { codePresent: false, credentialNames: ["BUZZARD_TURN_URL", "BUZZARD_STUN_URL"] }),
    adapter("phone", { codePresent: true, credentialNames: ["BUZZARD_SIP_URI"] }),
    adapter("sip", { codePresent: false, credentialNames: ["BUZZARD_SIP_URI"], blocked: true }),
    adapter("twilio", { codePresent: false, credentialNames: ["BUZZARD_TWILIO_ACCOUNT_SID"], blocked: true }),
  ];
}

module.exports = { assessVoice, authorizeOutbound, scheduleCouncilMeeting, escalateIncident, providerAdapters };
