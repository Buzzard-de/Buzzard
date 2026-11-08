const { runTextMeeting } = require("./councilMeeting");
const { identities } = require("./identity");
const { protoSynth } = require("../speech/nativeTts");

const HUMAN_GATES = Object.freeze([
  "GIT_PUSH",
  "MERGE",
  "DEPLOY",
  "PRODUCTION_RESTORE",
  "DATA_DELETE",
  "LOOSEN_SECURITY",
  "CHANGE_EGRESS_DENY",
  "ENABLE_SALES_OR_PAYMENTS",
  "ENABLE_LIVE_CARRIER",
  "EXPORT_SECRETS",
]);
const { cloneAttempt } = require("../speech/officialVoiceGuard");

const ROLES = Object.freeze({
  pusat: "orchestrator",
  sinan_bey: "chief_software_architect",
  esat_bey: "security_lead",
  dogu_bey: "research",
});

function denyGate(action, actorId = "sinan_bey") {
  if (HUMAN_GATES.includes(action)) {
    return { ok: false, code: "HUMAN_GATE_REQUIRED", action, actorId, executed: false };
  }
  return { ok: false, code: "UNKNOWN_GATE", action };
}

function meeting({ present = ["pusat", "sinan_bey", "esat_bey", "dogu_bey"] } = {}) {
  const ids = identities();
  const mix = ids.sinan_bey.id === "esat_bey" || ids.sinan_bey.id === "pusat";
  const text = runTextMeeting({
    members: present.filter((p) => p !== "pusat"),
  });
  const voice = present.includes("sinan_bey")
    ? { ...protoSynth({ text: "rapor", lang: "tr" }), officialVoiceUsed: false }
    : { skipped: true, reason: "sinan_not_present" };
  return {
    ok: true,
    present,
    absent: Object.keys(ROLES).filter((id) => !present.includes(id)),
    fakeAttendance: false,
    identityMix: mix,
    roles: ROLES,
    text,
    voiceReport: voice,
    clone: cloneAttempt({ requested: true }),
    liveVoice: false,
  };
}

module.exports = { denyGate, meeting, ROLES };
