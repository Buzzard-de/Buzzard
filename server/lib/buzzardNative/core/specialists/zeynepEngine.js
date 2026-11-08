const { check } = require("../permissionEngine");
const { assignVoice } = require("../identityRegistry");

function session({ actorId = "zeynep_hanim", locale = "de" } = {}) {
  if (!check(actorId, "PHONE_SCRIPT").ok) return { ok: false, code: "PERMISSION_DENIED" };
  return {
    ok: true,
    locale,
    liveCall: false,
    stt: "NOT_IMPLEMENTED",
    tts: "NOT_IMPLEMENTED",
    webrtc: "NOT_IMPLEMENTED",
    carrier: "NOT_CONFIGURED",
    turnStun: "NOT_CONFIGURED",
    liveVerified: false,
    script: ["greet", "identify_need", "verify_order_or_vehicle", "handoff_or_summarize"],
    teclog: "INTAKE_ONLY_NOT_LIVE",
  };
}

function liveDial() {
  return { ok: false, code: "HUMAN_GATE_REQUIRED", action: "PHONE_LIVE_CALL", liveCall: false };
}

function copySinanVoice() {
  return assignVoice({ fromId: "sinan_bey", toId: "zeynep_hanim" });
}

function handoff({ actorId = "zeynep_hanim", toId = "banu_hanim" } = {}) {
  if (!check(actorId, "PHONE_HANDOFF").ok) return { ok: false, code: "PERMISSION_DENIED" };
  return { ok: true, via: "agent_bus_or_pusat", toId, liveCall: false };
}

module.exports = { session, liveDial, copySinanVoice, handoff };
