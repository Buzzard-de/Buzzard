const { check } = require("../permissionEngine");
const { assignVoice } = require("../identityRegistry");

function session({ actorId = "zeynep_hanim", locale = "de", scriptedUtterance = "bestellung SYN-1" } = {}) {
  if (!check(actorId, "PHONE_SCRIPT").ok) return { ok: false, code: "PERMISSION_DENIED" };
  const started = Date.now();
  const stt = { text: String(scriptedUtterance), engine: "LOOPBACK", live: false };
  const tts = { text: `verstanden: ${stt.text}`, engine: "LOOPBACK", audio: Buffer.from(stt.text).toString("hex"), live: false };
  return {
    ok: true,
    locale,
    liveCall: false,
    stt: "LOOPBACK",
    tts: "LOOPBACK",
    webrtc: "NOT_IMPLEMENTED",
    carrier: "NOT_CONFIGURED",
    turnStun: "NOT_CONFIGURED",
    liveVerified: false,
    script: ["greet", "identify_need", "verify_order_or_vehicle", "handoff_or_summarize"],
    teclog: "INTAKE_ONLY_NOT_LIVE",
    transcript: [
      { role: "user", text: stt.text, at: started },
      { role: "assistant", text: tts.text, at: started + 1 },
    ],
    clockMs: 1,
    cancelled: false,
    timeoutMs: 30_000,
    clone: false,
  };
}

function cancelSession() {
  return { ok: true, cancelled: true, liveCall: false };
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

module.exports = { session, cancelSession, liveDial, copySinanVoice, handoff };
