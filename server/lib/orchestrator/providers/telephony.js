const crypto = require("crypto");
const { getFlags, isProduction } = require("../flags");
const { PROVIDER_HEALTH } = require("../constants");
const breaker = require("../circuitBreaker");

function credentialsPresent() {
  return Boolean(
    process.env.TELEPHONY_ACCOUNT_SID &&
      process.env.TELEPHONY_AUTH_TOKEN &&
      process.env.PHONE_NUMBER
  );
}

function providerName() {
  return process.env.TELEPHONY_PROVIDER || "none";
}

function liveAllowed() {
  const flags = getFlags();
  return (
    flags.PHONE_ENABLED &&
    credentialsPresent() &&
    providerName() !== "none" &&
    providerName() !== "mock"
  );
}

function notConfigured(action) {
  return {
    ok: false,
    code: "PHONE_PROVIDER_NOT_CONFIGURED",
    action,
    provider: providerName(),
    live: false,
  };
}

async function createCall({ to, from, conversationId } = {}) {
  const flags = getFlags();
  if (!flags.PHONE_ENABLED || !flags.OUTBOUND_CALL_ENABLED) {
    return { ok: false, code: "PHONE_DISABLED", live: false };
  }
  if (!liveAllowed()) {
    if (!isProduction() && flags.MOCK_TELEPHONY) {
      return {
        ok: true,
        mock: true,
        live: false,
        code: "MOCK_TELEPHONY",
        callId: `mock_${crypto.randomBytes(4).toString("hex")}`,
        to,
        from: from || process.env.PHONE_NUMBER || null,
        conversationId,
        status: "MOCK_CREATED",
      };
    }
    return notConfigured("createCall");
  }
  if (!breaker.allow("telephony")) return { ok: false, code: "CIRCUIT_OPEN" };
  return { ok: false, code: "TELEPHONY_PROVIDER_NOT_WIRED", provider: providerName(), live: false };
}

async function answerCall(callId) {
  if (!liveAllowed()) return notConfigured("answerCall");
  return { ok: false, code: "TELEPHONY_PROVIDER_NOT_WIRED", callId };
}

async function hangupCall(callId) {
  if (!liveAllowed()) return notConfigured("hangupCall");
  return { ok: false, code: "TELEPHONY_PROVIDER_NOT_WIRED", callId };
}

async function transferCall(callId, target) {
  if (!liveAllowed()) return notConfigured("transferCall");
  return { ok: false, code: "TELEPHONY_PROVIDER_NOT_WIRED", callId, target };
}

async function sendDTMF(callId, digits) {
  if (!liveAllowed()) return notConfigured("sendDTMF");
  return { ok: false, code: "TELEPHONY_PROVIDER_NOT_WIRED", callId, digits };
}

async function getCallStatus(callId) {
  if (!callId) return { ok: false, code: "INVALID_CALL" };
  if (!liveAllowed()) return { ok: true, callId, status: "NOT_LIVE", code: "PHONE_PROVIDER_NOT_CONFIGURED" };
  return { ok: false, code: "TELEPHONY_PROVIDER_NOT_WIRED", callId };
}

async function recordCall() {
  if (!getFlags().CALL_RECORDING_ENABLED) return { ok: false, code: "RECORDING_DISABLED" };
  if (!liveAllowed()) return notConfigured("recordCall");
  return { ok: false, code: "TELEPHONY_PROVIDER_NOT_WIRED" };
}

async function getRecording() {
  return { ok: false, code: "RECORDING_ACCESS_RESTRICTED" };
}

async function getTranscript(callId) {
  return { ok: true, callId, transcript: null, available: false };
}

function health() {
  if (!credentialsPresent()) return PROVIDER_HEALTH.NOT_CONFIGURED;
  if (!getFlags().PHONE_ENABLED) return PROVIDER_HEALTH.DEGRADED;
  return breaker.healthOf("telephony");
}

module.exports = {
  createCall,
  answerCall,
  hangupCall,
  transferCall,
  sendDTMF,
  getCallStatus,
  recordCall,
  getRecording,
  getTranscript,
  health,
  liveAllowed,
  credentialsPresent,
  providerName,
};
