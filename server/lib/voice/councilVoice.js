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
    status: "CODE_READY",
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

function providerAdapters() {
  return [
    { id: "sip", configured: false, status: "BLOCKED" },
    { id: "twilio", configured: false, status: "BLOCKED" },
    { id: "stt", configured: false, status: "CODE_READY" },
    { id: "tts", configured: false, status: "CODE_READY" },
    { id: "stun_turn", configured: false, status: "BLOCKED" },
  ];
}

module.exports = { assessVoice, authorizeOutbound, scheduleCouncilMeeting, escalateIncident, providerAdapters };
