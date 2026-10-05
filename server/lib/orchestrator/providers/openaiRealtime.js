const crypto = require("crypto");
const { getFlags } = require("../flags");
const { providerFetch } = require("./httpClient");
const { redactObject } = require("../securityGuard");
const voice = require("../voiceSession");
const { VOICE_STATE } = require("../constants");
const { handleRequest } = require("../core");
const cost = require("../costControl");
const { checkLimit } = require("../rateLimit");

const sessions = new Map();
let lastLiveOk = false;

const CLIENT_SECRETS_URL = "https://api.openai.com/v1/realtime/client_secrets";
const WEBRTC_CALLS_URL = "https://api.openai.com/v1/realtime/calls";

function apiKey() {
  return String(process.env.OPENAI_API_KEY || "").trim();
}

function configured() {
  return Boolean(apiKey());
}

function maxSessionMs() {
  return Number(process.env.REALTIME_MAX_SESSION_MS || 15 * 60 * 1000);
}

function modelName() {
  return process.env.OPENAI_REALTIME_MODEL || "gpt-realtime";
}

function authHeaders() {
  const headers = {
    Authorization: `Bearer ${apiKey()}`,
    "Content-Type": "application/json",
  };
  if (Object.keys(headers).some((key) => /^openai-beta$/i.test(key))) {
    throw new Error("OPENAI_BETA_HEADER_FORBIDDEN");
  }
  return headers;
}

function lastLiveSuccess() {
  return lastLiveOk;
}

function inspect() {
  return {
    provider: "openai-realtime",
    configured: configured(),
    wired: configured(),
    liveOk: lastLiveOk,
    betaHeader: false,
    webrtcTransport: "openai",
    status: !getFlags().VOICE_ENABLED ? "DISABLED" : configured() ? (lastLiveOk ? "READY" : "CONFIGURED") : "NOT_CONFIGURED",
  };
}

function publicSession(row) {
  if (!row) return null;
  return {
    id: row.id,
    voiceSessionId: row.voiceSessionId,
    state: row.state,
    model: row.model,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    ephemeral: true,
  };
}

function expired(row) {
  return Date.now() > row.expiresAt || Date.now() - row.createdAt > maxSessionMs();
}

async function createEphemeralSession({ language, userId, conversationId, fetchImpl } = {}) {
  if (!getFlags().VOICE_ENABLED) {
    return { ok: false, code: "VOICE_DISABLED", live: false };
  }
  if (!configured()) {
    return { ok: false, code: "OPENAI_REALTIME_NOT_CONFIGURED", live: false, configured: false };
  }
  const limit = checkLimit({ ip: userId || "realtime", scope: "stt" });
  if (!limit.allowed) return { ok: false, code: "RATE_LIMITED", live: false };

  const headers = authHeaders();
  if (headers["OpenAI-Beta"] || headers["openai-beta"]) {
    return { ok: false, code: "OPENAI_BETA_HEADER_FORBIDDEN", live: false };
  }

  const result = await providerFetch(
    CLIENT_SECRETS_URL,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        expires_after: { anchor: "created_at", seconds: 60 },
        session: {
          type: "realtime",
          model: modelName(),
        },
      }),
    },
    { breakerName: "openai-realtime", fetchImpl, timeoutMs: 12000 }
  );

  if (!result.ok) {
    lastLiveOk = false;
    return redactObject({
      ok: false,
      code: result.code === "PROVIDER_AUTH_FAILED" ? "OPENAI_AUTH_FAILED" : result.code || "OPENAI_REALTIME_ERROR",
      live: false,
      status: result.status,
    });
  }

  const value = result.body?.value || result.body?.client_secret?.value;
  if (!value || String(value).startsWith("sk-")) {
    lastLiveOk = false;
    return { ok: false, code: "INVALID_RESPONSE", live: false };
  }

  lastLiveOk = true;
  const voiceSession = voice.createSession({ userId, conversationId, language: language || "de" });
  const id = `rt_${crypto.randomBytes(8).toString("hex")}`;
  const row = {
    id,
    voiceSessionId: voiceSession.id,
    state: VOICE_STATE.CONNECTING,
    model: modelName(),
    createdAt: Date.now(),
    expiresAt: Date.now() + Math.min(60_000, maxSessionMs()),
    language: language || "de",
    userId: userId || null,
  };
  sessions.set(id, row);
  voice.setState(voiceSession.id, VOICE_STATE.CONNECTING, { force: true });
  cost.recordUsage({
    customerId: userId,
    sessionId: id,
    provider: "openai-realtime",
    kind: "realtime_session",
    estimatedCost: 0,
  });

  return {
    ok: true,
    live: true,
    ephemeral: true,
    ephemeralKey: value,
    expiresAt: row.expiresAt,
    webrtcUrl: WEBRTC_CALLS_URL,
    model: row.model,
    session: publicSession(row),
    voiceSessionId: voiceSession.id,
  };
}

function setState(id, state) {
  const row = sessions.get(id);
  if (!row) return { ok: false, code: "SESSION_NOT_FOUND" };
  if (expired(row)) {
    row.state = VOICE_STATE.ENDED;
    return { ok: false, code: "REALTIME_SESSION_EXPIRED", session: publicSession(row) };
  }
  row.state = state;
  if (row.voiceSessionId) voice.setState(row.voiceSessionId, state, { force: true });
  return { ok: true, session: publicSession(row) };
}

function bargeIn(id) {
  const row = sessions.get(id);
  if (!row) return { ok: false, code: "SESSION_NOT_FOUND" };
  row.state = VOICE_STATE.INTERRUPTED;
  const voiceResult = row.voiceSessionId ? voice.bargeIn(row.voiceSessionId) : { ok: true };
  setState(id, VOICE_STATE.LISTENING);
  return { ok: true, cancelled: true, listening: true, voice: voiceResult, session: publicSession(row) };
}

async function handleUserTranscript(id, { transcript, language } = {}) {
  const row = sessions.get(id);
  if (!row) return { ok: false, code: "SESSION_NOT_FOUND" };
  if (expired(row)) return { ok: false, code: "REALTIME_SESSION_EXPIRED" };
  setState(id, VOICE_STATE.THINKING);
  const orch = await handleRequest({
    message: transcript,
    language: language || row.language,
    channel: "VOICE",
    userId: row.userId,
    sessionId: row.voiceSessionId,
  });
  const next = orch.state === "WAITING_APPROVAL" ? VOICE_STATE.PAUSED : VOICE_STATE.SPEAKING;
  setState(id, next);
  return {
    ok: Boolean(orch.ok),
    orchestrator: orch,
    session: publicSession(row),
    speak: orch.reply || orch.message || "",
    waitingApproval: orch.state === "WAITING_APPROVAL",
  };
}

function closeSession(id) {
  const row = sessions.get(id);
  if (!row) return { ok: false, code: "SESSION_NOT_FOUND" };
  row.state = VOICE_STATE.ENDED;
  sessions.delete(id);
  return { ok: true, session: publicSession(row) };
}

function health() {
  if (!configured()) return "NOT_CONFIGURED";
  if (!getFlags().VOICE_ENABLED) return "DISABLED";
  return lastLiveOk ? "READY" : "CONFIGURED";
}

function resetForTests() {
  lastLiveOk = false;
  sessions.clear();
}

module.exports = {
  configured,
  inspect,
  lastLiveSuccess,
  createEphemeralSession,
  handleUserTranscript,
  bargeIn,
  setState,
  closeSession,
  health,
  authHeaders,
  CLIENT_SECRETS_URL,
  WEBRTC_CALLS_URL,
  resetForTests,
};
