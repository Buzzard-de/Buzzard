const crypto = require("crypto");
const { db } = require("../db");
const telephony = require("./providers/telephony");
const voice = require("./voiceSession");
const { getFlags } = require("./flags");
const { CALL_STATE } = require("./constants");
const phoneAssistant = require("../phoneAssistantService");
const conversations = require("./conversationManager");
const audit = require("./auditLogger");
const { checkLimit } = require("./rateLimit");

const CALL_TRANSITIONS = {
  [CALL_STATE.CREATED]: [CALL_STATE.RINGING, CALL_STATE.FAILED, CALL_STATE.CANCELLED],
  [CALL_STATE.RINGING]: [CALL_STATE.ANSWERED, CALL_STATE.FAILED, CALL_STATE.CANCELLED],
  [CALL_STATE.ANSWERED]: [CALL_STATE.AUTHENTICATING, CALL_STATE.ACTIVE, CALL_STATE.FAILED],
  [CALL_STATE.AUTHENTICATING]: [CALL_STATE.ACTIVE, CALL_STATE.FAILED, CALL_STATE.HANDOFF],
  [CALL_STATE.ACTIVE]: [CALL_STATE.ON_HOLD, CALL_STATE.TRANSFERRING, CALL_STATE.HANDOFF, CALL_STATE.COMPLETED, CALL_STATE.FAILED],
  [CALL_STATE.ON_HOLD]: [CALL_STATE.ACTIVE, CALL_STATE.HANDOFF, CALL_STATE.COMPLETED, CALL_STATE.FAILED],
  [CALL_STATE.TRANSFERRING]: [CALL_STATE.HANDOFF, CALL_STATE.ACTIVE, CALL_STATE.COMPLETED, CALL_STATE.FAILED],
  [CALL_STATE.HANDOFF]: [CALL_STATE.COMPLETED, CALL_STATE.FAILED],
  [CALL_STATE.COMPLETED]: [],
  [CALL_STATE.FAILED]: [],
  [CALL_STATE.CANCELLED]: [],
};

const EVENT_TO_STATE = {
  CALL_STARTED: CALL_STATE.RINGING,
  RINGING: CALL_STATE.RINGING,
  ANSWERED: CALL_STATE.ANSWERED,
  AUTHENTICATING: CALL_STATE.AUTHENTICATING,
  ACTIVE: CALL_STATE.ACTIVE,
  ON_HOLD: CALL_STATE.ON_HOLD,
  TRANSFERRING: CALL_STATE.TRANSFERRING,
  HANDOFF: CALL_STATE.HANDOFF,
  CALL_COMPLETED: CALL_STATE.COMPLETED,
  COMPLETED: CALL_STATE.COMPLETED,
  CALL_FAILED: CALL_STATE.FAILED,
  FAILED: CALL_STATE.FAILED,
  CANCELLED: CALL_STATE.CANCELLED,
};

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
  try {
    db.prepare("UPDATE orch_phone_calls SET call_state = ?, trace_id = ?, session_id = ? WHERE id = ?").run(
      row.callState || CALL_STATE.CREATED,
      row.traceId || null,
      row.sessionId || row.voiceSessionId || null,
      row.id
    );
  } catch {
    /* optional columns */
  }
  return getCall(row.id);
}

function getCall(id) {
  return db.prepare("SELECT * FROM orch_phone_calls WHERE id = ?").get(id) || null;
}

function setCallState(callId, next, eventType) {
  const call = getCall(callId);
  if (!call) return null;
  const current = call.call_state || EVENT_TO_STATE[call.status] || CALL_STATE.CREATED;
  const allowed = CALL_TRANSITIONS[current] || Object.values(CALL_STATE);
  if (current !== next && allowed.length && !allowed.includes(next)) {
    return call;
  }
  db.prepare("UPDATE orch_phone_calls SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
    eventType || next,
    callId
  );
  try {
    db.prepare("UPDATE orch_phone_calls SET call_state = ?, last_event = ? WHERE id = ?").run(next, eventType || next, callId);
  } catch {
    /* optional */
  }
  audit.writeAudit({
    what: "call_state",
    channel: "PHONE",
    result: next,
    conversationId: call.conversation_id,
    requestId: callId,
  });
  return getCall(callId);
}

async function startOutbound({ to, userId, conversationId, language }) {
  const flags = getFlags();
  if (!flags.OUTBOUND_CALL_ENABLED) {
    return { ok: false, code: "OUTBOUND_CALL_DISABLED" };
  }
  const limit = checkLimit({ userId, phone: to, scope: "phone_outbound" });
  if (!limit.allowed) return { ok: false, code: "RATE_LIMITED" };
  const provider = await telephony.createCall({ to, conversationId });
  if (!provider.ok && provider.code !== "MOCK_TELEPHONY") {
    return provider;
  }
  const voiceSession = voice.createSession({ userId, conversationId, language });
  const call = persistCall({
    id: provider.callId || `call_${crypto.randomBytes(6).toString("hex")}`,
    conversationId,
    voiceSessionId: voiceSession.id,
    sessionId: voiceSession.id,
    direction: "OUTBOUND",
    to,
    status: provider.status || provider.code,
    provider: provider.provider,
    callState: CALL_STATE.CREATED,
    traceId: conversationId || voiceSession.id,
  });
  setCallState(call.id, CALL_STATE.RINGING, "RINGING");
  return { ok: Boolean(provider.ok), ...provider, call: getCall(call.id), voiceSession };
}

async function startInbound({ from, to, conversationId, language }) {
  const flags = getFlags();
  if (!flags.INBOUND_CALL_ENABLED) {
    return { ok: false, code: "INBOUND_CALL_DISABLED" };
  }
  const limit = checkLimit({ phone: from, scope: "phone_inbound" });
  if (!limit.allowed) return { ok: false, code: "RATE_LIMITED" };
  if (!telephony.liveAllowed() && !flags.MOCK_TELEPHONY) {
    return { ok: false, code: "PHONE_PROVIDER_NOT_CONFIGURED" };
  }
  const voiceSession = voice.createSession({ conversationId, language });
  const call = persistCall({
    id: `call_${crypto.randomBytes(6).toString("hex")}`,
    conversationId,
    voiceSessionId: voiceSession.id,
    sessionId: voiceSession.id,
    direction: "INBOUND",
    from,
    to,
    status: "CALL_STARTED",
    callState: CALL_STATE.CREATED,
  });
  setCallState(call.id, CALL_STATE.RINGING, "CALL_STARTED");
  return { ok: true, mock: !telephony.liveAllowed(), call: getCall(call.id), voiceSession };
}

function applyEvent(callId, eventType) {
  const next = EVENT_TO_STATE[eventType] || eventType;
  return setCallState(callId, next, eventType);
}

function handoff({ conversationId, locale = "de", reason, channel = "TEXT", extra } = {}) {
  const routed = phoneAssistant.routeToHumanSupport(locale);
  const conversation = conversationId ? conversations.getConversation(conversationId) : null;
  const context = {
    locale,
    transferredAt: new Date().toISOString(),
    customer: conversation?.user_id || extra?.customer || null,
    conversation: conversationId || null,
    intent: extra?.intent || conversation?.intent || null,
    lastMessages: conversation?.messages?.slice(-8) || [],
    toolResults: extra?.toolResults || [],
    risk: extra?.risk || null,
    approval: extra?.approval || null,
    error: extra?.error || null,
    channel,
    callId: extra?.callId || null,
    sessionId: extra?.sessionId || null,
  };
  const id = `ho_${crypto.randomBytes(6).toString("hex")}`;
  db.prepare(`INSERT INTO orch_handoffs(id, conversation_id, reason, context_json) VALUES (?,?,?,?)`).run(
    id,
    conversationId || null,
    reason || "HUMAN_AGENT_REQUEST",
    JSON.stringify(context)
  );
  if (extra?.callId) {
    applyEvent(extra.callId, CALL_STATE.HANDOFF);
  }
  if (extra?.sessionId) {
    voice.cancelTts(extra.sessionId);
    voice.setState(extra.sessionId, "ENDING");
  }
  if (channel === "PHONE") {
    return { ok: true, status: "HANDOFF_REQUESTED", mode: "PHONE_TRANSFER", ...routed, handoffId: id, context };
  }
  if (channel === "VOICE") {
    return { ok: true, status: "HANDOFF_REQUESTED", mode: "VOICE_STOP_THEN_HUMAN", ...routed, handoffId: id, context };
  }
  return { ok: true, status: "HANDOFF_REQUESTED", mode: "SUPPORT_QUEUE", ...routed, handoffId: id, context };
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
    .prepare("SELECT * FROM orch_phone_calls WHERE status NOT IN ('CALL_COMPLETED','CALL_FAILED','COMPLETED','FAILED','CANCELLED') ORDER BY created_at DESC LIMIT 40")
    .all();
}

function listHandoffs(limit = 20) {
  return db.prepare("SELECT * FROM orch_handoffs ORDER BY created_at DESC LIMIT ?").all(limit);
}

module.exports = {
  getCall,
  startOutbound,
  startInbound,
  applyEvent,
  setCallState,
  handoff,
  callerIdentity,
  recordingAccessDenied,
  listActiveCalls,
  listHandoffs,
  CALL_STATE,
};
