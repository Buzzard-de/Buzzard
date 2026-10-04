const crypto = require("crypto");
const { db } = require("../db");
const telephony = require("./providers/telephony");
const voice = require("./voiceSession");
const { getFlags } = require("./flags");
const phoneAssistant = require("../phoneAssistantService");

function persistCall(row) {
  db.prepare(
    `INSERT INTO orch_phone_calls(id, conversation_id, voice_session_id, direction, from_number, to_number, status, provider, recording_policy)
     VALUES (?,?,?,?,?,?,?,?,?)`
  ).run(
    row.id,
    row.conversationId || null,
    row.voiceSessionId || null,
    row.direction,
    row.from || null,
    row.to || null,
    row.status,
    row.provider || telephony.providerName(),
    JSON.stringify({
      consentRequired: true,
      retentionDays: Number(process.env.CALL_RECORDING_RETENTION_DAYS || 30),
      access: "admin-only",
    })
  );
  return getCall(row.id);
}

function getCall(id) {
  return db.prepare("SELECT * FROM orch_phone_calls WHERE id = ?").get(id) || null;
}

async function startOutbound({ to, userId, conversationId, language }) {
  const flags = getFlags();
  if (!flags.OUTBOUND_CALL_ENABLED) {
    return { ok: false, code: "OUTBOUND_CALL_DISABLED" };
  }
  const provider = await telephony.createCall({ to, conversationId });
  if (!provider.ok && provider.code !== "MOCK_TELEPHONY") {
    return provider;
  }
  const voiceSession = voice.createSession({ userId, conversationId, language });
  const call = persistCall({
    id: provider.callId || `call_${crypto.randomBytes(6).toString("hex")}`,
    conversationId,
    voiceSessionId: voiceSession.id,
    direction: "OUTBOUND",
    to,
    status: provider.status || provider.code,
    provider: provider.provider,
  });
  return { ok: Boolean(provider.ok), ...provider, call, voiceSession };
}

async function startInbound({ from, to, conversationId, language }) {
  const flags = getFlags();
  if (!flags.INBOUND_CALL_ENABLED) {
    return { ok: false, code: "INBOUND_CALL_DISABLED" };
  }
  if (!telephony.liveAllowed() && !flags.MOCK_TELEPHONY) {
    return { ok: false, code: "PHONE_PROVIDER_NOT_CONFIGURED" };
  }
  const voiceSession = voice.createSession({ conversationId, language });
  const call = persistCall({
    id: `call_${crypto.randomBytes(6).toString("hex")}`,
    conversationId,
    voiceSessionId: voiceSession.id,
    direction: "INBOUND",
    from,
    to,
    status: "CALL_STARTED",
  });
  return { ok: true, mock: !telephony.liveAllowed(), call, voiceSession };
}

function applyEvent(callId, eventType) {
  db.prepare("UPDATE orch_phone_calls SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
    eventType,
    callId
  );
  return getCall(callId);
}

function handoff({ conversationId, locale = "de", reason }) {
  const routed = phoneAssistant.routeToHumanSupport(locale);
  db.prepare(
    `INSERT INTO orch_handoffs(id, conversation_id, reason, context_json) VALUES (?,?,?,?)`
  ).run(
    `ho_${crypto.randomBytes(6).toString("hex")}`,
    conversationId || null,
    reason || "HUMAN_AGENT_REQUEST",
    JSON.stringify({ locale, transferredAt: new Date().toISOString() })
  );
  return { ok: true, status: "HANDOFF_REQUESTED", ...routed };
}

function callerIdentity({ phone, verified = false }) {
  return {
    phone,
    identitySignal: Boolean(phone),
    strongAuth: false,
    spoofingRisk: true,
    verified,
    sensitiveActionsAllowed: Boolean(verified && phone),
  };
}

function recordingAccessDenied() {
  return { ok: false, code: "RECORDING_ACCESS_RESTRICTED", consentPolicy: true };
}

function listActiveCalls() {
  return db
    .prepare("SELECT * FROM orch_phone_calls WHERE status NOT IN ('CALL_COMPLETED','CALL_FAILED') ORDER BY created_at DESC LIMIT 40")
    .all();
}

module.exports = {
  getCall,
  startOutbound,
  startInbound,
  applyEvent,
  handoff,
  callerIdentity,
  recordingAccessDenied,
  listActiveCalls,
};
