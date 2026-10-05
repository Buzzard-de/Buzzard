const crypto = require("crypto");
const { getFlags, isProduction } = require("../flags");
const { PROVIDER_HEALTH } = require("../constants");
const breaker = require("../circuitBreaker");
const { providerFetch } = require("./httpClient");
const cost = require("../costControl");
const { snapshot } = require("./status");

let lastLiveOk = false;

function sid() {
  return process.env.TELEPHONY_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID || "";
}

function token() {
  return process.env.TELEPHONY_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN || "";
}

function fromNumber() {
  return process.env.PHONE_NUMBER || process.env.TWILIO_PHONE_NUMBER || "";
}

function credentialsPresent() {
  if (sid() && token() && fromNumber()) return true;
  if (process.env.TELNYX_API_KEY && process.env.TELNYX_CONNECTION_ID && fromNumber()) return true;
  if (process.env.VONAGE_API_KEY && process.env.VONAGE_API_SECRET && fromNumber()) return true;
  if (process.env.PLIVO_AUTH_ID && process.env.PLIVO_AUTH_TOKEN && fromNumber()) return true;
  return false;
}

function providerName() {
  if (process.env.TELEPHONY_PROVIDER) return process.env.TELEPHONY_PROVIDER;
  if (sid()) return "twilio";
  if (process.env.TELNYX_API_KEY) return "telnyx";
  if (process.env.VONAGE_API_KEY) return "vonage";
  if (process.env.PLIVO_AUTH_ID) return "plivo";
  if (process.env.SIP_ENDPOINT) return "sip";
  return "none";
}

function liveAllowed() {
  const flags = getFlags();
  return flags.PHONE_ENABLED && credentialsPresent() && !["none", "mock"].includes(providerName());
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

async function twilioForm(path, fields, fetchImpl) {
  const auth = Buffer.from(`${sid()}:${token()}`).toString("base64");
  const body = new URLSearchParams(fields);
  return providerFetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid()}/${path}`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
    { breakerName: "telephony", fetchImpl, timeoutMs: Number(process.env.PHONE_TIMEOUT_MS || 15000) }
  );
}

function xmlEscape(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

function mediaStreamUrl() {
  return String(process.env.TELEPHONY_MEDIA_STREAM_URL || process.env.TWILIO_MEDIA_STREAM_URL || "").trim();
}

function mediaStreamTwiml({ bidirectional } = {}) {
  const url = mediaStreamUrl();
  if (!url.startsWith("wss://")) {
    return { ok: false, code: "PHONE_MEDIA_STREAM_NOT_CONFIGURED", wss: false, twiml: null };
  }
  const bi = bidirectional != null ? Boolean(bidirectional) : process.env.TELEPHONY_MEDIA_STREAM_BIDIRECTIONAL === "1";
  const inner = bi
    ? `<Connect><Stream url="${xmlEscape(url)}" /></Connect>`
    : `<Start><Stream url="${xmlEscape(url)}" /></Start>`;
  return { ok: true, wss: true, bidirectional: bi, twiml: `<Response>${inner}</Response>` };
}

async function createTwilioCall({ to, from, conversationId, fetchImpl }) {
  const voiceUrl = process.env.TELEPHONY_VOICE_URL || process.env.TWILIO_VOICE_URL || "";
  const fields = {
    To: to,
    From: from || fromNumber(),
    StatusCallback: process.env.TELEPHONY_STATUS_URL || "",
  };
  if (voiceUrl) fields.Url = voiceUrl;
  else {
    const stream = mediaStreamTwiml();
    fields.Twiml = stream.ok ? stream.twiml : "<Response><Say language=\"de-DE\">Buzzard</Say></Response>";
  }
  const result = await twilioForm("Calls.json", fields, fetchImpl);
  if (!result.ok) {
    return { ok: false, code: result.code === "CIRCUIT_OPEN" ? "CIRCUIT_OPEN" : "PHONE_PROVIDER_ERROR", provider: "twilio", live: false, status: result.status };
  }
  lastLiveOk = true;
  cost.recordUsage({ conversationId, phoneSeconds: 0, provider: "twilio", kind: "phone_create" });
  return {
    ok: true,
    live: true,
    mock: false,
    callId: result.body?.sid,
    to,
    from: fields.From,
    conversationId,
    status: result.body?.status || "queued",
    provider: "twilio",
    requestId: result.requestId,
  };
}

async function createTelnyxCall({ to, from, conversationId, fetchImpl }) {
  const result = await providerFetch(
    "https://api.telnyx.com/v2/calls",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.TELNYX_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to,
        from: from || fromNumber(),
        connection_id: process.env.TELNYX_CONNECTION_ID,
      }),
    },
    { breakerName: "telephony", fetchImpl }
  );
  if (!result.ok) {
    return { ok: false, code: "PHONE_PROVIDER_ERROR", provider: "telnyx", live: false, status: result.status };
  }
  lastLiveOk = true;
  return {
    ok: true,
    live: true,
    mock: false,
    callId: result.body?.data?.call_control_id,
    to,
    from: from || fromNumber(),
    conversationId,
    status: result.body?.data?.status || "initiated",
    provider: "telnyx",
    requestId: result.requestId,
  };
}

function e164(value) {
  const raw = String(value || "").replace(/[^\d+]/g, "");
  return /^\+[1-9]\d{7,14}$/.test(raw) ? raw : null;
}

async function createVonageCall({ to, from, conversationId, fetchImpl }) {
  const answer = process.env.TELEPHONY_VOICE_URL || process.env.VONAGE_ANSWER_URL;
  if (!answer) return { ok: false, code: "PHONE_PROVIDER_NOT_CONFIGURED", provider: "vonage", live: false };
  const auth = Buffer.from(`${process.env.VONAGE_API_KEY}:${process.env.VONAGE_API_SECRET}`).toString("base64");
  const dest = e164(to);
  const src = e164(from || fromNumber());
  if (!dest || !src) return { ok: false, code: "INVALID_PHONE_NUMBER", provider: "vonage" };
  const result = await providerFetch(
    "https://api.nexmo.com/v1/calls",
    {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        to: [{ type: "phone", number: dest.replace("+", "") }],
        from: { type: "phone", number: src.replace("+", "") },
        answer_url: [answer],
      }),
    },
    { breakerName: "telephony", fetchImpl }
  );
  if (!result.ok) {
    return { ok: false, code: result.code || "PHONE_PROVIDER_ERROR", provider: "vonage", live: false, status: result.status };
  }
  lastLiveOk = true;
  return {
    ok: true,
    live: true,
    mock: false,
    callId: result.body?.uuid,
    to: dest,
    from: src,
    conversationId,
    status: result.body?.status || "started",
    provider: "vonage",
    requestId: result.requestId,
  };
}

async function createPlivoCall({ to, from, conversationId, fetchImpl }) {
  const answer = process.env.TELEPHONY_VOICE_URL || process.env.PLIVO_ANSWER_URL;
  if (!answer) return { ok: false, code: "PHONE_PROVIDER_NOT_CONFIGURED", provider: "plivo", live: false };
  const authId = process.env.PLIVO_AUTH_ID;
  const dest = e164(to);
  const src = e164(from || fromNumber());
  if (!dest || !src) return { ok: false, code: "INVALID_PHONE_NUMBER", provider: "plivo" };
  const auth = Buffer.from(`${authId}:${process.env.PLIVO_AUTH_TOKEN}`).toString("base64");
  const result = await providerFetch(
    `https://api.plivo.com/v1/Account/${authId}/Call/`,
    {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: src, to: dest, answer_url: answer }),
    },
    { breakerName: "telephony", fetchImpl }
  );
  if (!result.ok) {
    return { ok: false, code: result.code || "PHONE_PROVIDER_ERROR", provider: "plivo", live: false, status: result.status };
  }
  lastLiveOk = true;
  return {
    ok: true,
    live: true,
    mock: false,
    callId: result.body?.request_uuid,
    to: dest,
    from: src,
    conversationId,
    status: "queued",
    provider: "plivo",
    requestId: result.requestId,
  };
}

async function createCall({ to, from, conversationId, fetchImpl } = {}) {
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
        from: from || fromNumber() || null,
        conversationId,
        status: "MOCK_CREATED",
      };
    }
    return notConfigured("createCall");
  }
  if (!breaker.allow("telephony")) return { ok: false, code: "CIRCUIT_OPEN" };
  const dest = e164(to);
  if (!dest) return { ok: false, code: "INVALID_PHONE_NUMBER", live: false };
  const name = providerName();
  if (name === "twilio") return createTwilioCall({ to: dest, from, conversationId, fetchImpl });
  if (name === "telnyx") return createTelnyxCall({ to: dest, from, conversationId, fetchImpl });
  if (name === "vonage") return createVonageCall({ to: dest, from, conversationId, fetchImpl });
  if (name === "plivo") return createPlivoCall({ to: dest, from, conversationId, fetchImpl });
  if (name === "sip") {
    return { ok: false, code: "TELEPHONY_PROVIDER_NOT_WIRED", provider: "sip", live: false };
  }
  return notConfigured("createCall");
}

async function answerCall(callId, fetchImpl) {
  if (!liveAllowed()) return notConfigured("answerCall");
  if (providerName() !== "twilio") return { ok: false, code: "TELEPHONY_PROVIDER_NOT_WIRED", callId };
  return twilioForm(`Calls/${callId}.json`, { Status: "in-progress" }, fetchImpl).then((result) =>
    result.ok
      ? { ok: true, callId, status: result.body?.status, live: true }
      : { ok: false, code: "PHONE_PROVIDER_ERROR", callId }
  );
}

async function hangupCall(callId, fetchImpl) {
  if (!liveAllowed()) return notConfigured("hangupCall");
  if (providerName() !== "twilio") return { ok: false, code: "TELEPHONY_PROVIDER_NOT_WIRED", callId };
  return twilioForm(`Calls/${callId}.json`, { Status: "completed" }, fetchImpl).then((result) =>
    result.ok
      ? { ok: true, callId, status: "completed", live: true }
      : { ok: false, code: "PHONE_PROVIDER_ERROR", callId }
  );
}

async function transferCall(callId, target, fetchImpl) {
  if (!liveAllowed()) return notConfigured("transferCall");
  if (providerName() !== "twilio") return { ok: false, code: "TELEPHONY_PROVIDER_NOT_WIRED", callId, target };
  const twiml = `<Response><Dial>${String(target || "").replace(/[^\d+]/g, "")}</Dial></Response>`;
  return twilioForm(`Calls/${callId}.json`, { Twiml: twiml }, fetchImpl).then((result) =>
    result.ok
      ? { ok: true, callId, target, status: "transferring", live: true }
      : { ok: false, code: "PHONE_PROVIDER_ERROR", callId }
  );
}

async function sendDTMF(callId, digits, fetchImpl) {
  if (!liveAllowed()) return notConfigured("sendDTMF");
  if (providerName() !== "twilio") return { ok: false, code: "TELEPHONY_PROVIDER_NOT_WIRED", callId, digits };
  return twilioForm(`Calls/${callId}.json`, { SendDigits: String(digits || "") }, fetchImpl).then((result) =>
    result.ok ? { ok: true, callId, digits, live: true } : { ok: false, code: "PHONE_PROVIDER_ERROR", callId }
  );
}

async function getCallStatus(callId, fetchImpl) {
  if (!callId) return { ok: false, code: "INVALID_CALL" };
  if (!liveAllowed()) return { ok: true, callId, status: "NOT_LIVE", code: "PHONE_PROVIDER_NOT_CONFIGURED" };
  if (providerName() !== "twilio") return { ok: false, code: "TELEPHONY_PROVIDER_NOT_WIRED", callId };
  const auth = Buffer.from(`${sid()}:${token()}`).toString("base64");
  const result = await providerFetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid()}/Calls/${callId}.json`,
    { headers: { Authorization: `Basic ${auth}` } },
    { breakerName: "telephony", fetchImpl }
  );
  if (!result.ok) return { ok: false, code: "PHONE_PROVIDER_ERROR", callId };
  return { ok: true, callId, status: result.body?.status, live: true, provider: "twilio" };
}

async function recordCall() {
  if (!getFlags().CALL_RECORDING_ENABLED) return { ok: false, code: "RECORDING_DISABLED" };
  if (!liveAllowed()) return notConfigured("recordCall");
  return { ok: false, code: "RECORDING_CONSENT_REQUIRED" };
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

function lastLiveSuccess() {
  return lastLiveOk;
}

function inspect() {
  const name = providerName();
  const wired = ["twilio", "telnyx", "vonage", "plivo"].includes(name);
  return {
    provider: name,
    configured: credentialsPresent(),
    wired,
    liveOk: lastLiveOk,
    status: snapshot({
      configured: credentialsPresent(),
      wired,
      disabled: !getFlags().PHONE_ENABLED,
      liveOk: lastLiveOk,
    }),
  };
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
  lastLiveSuccess,
  inspect,
  e164,
  mediaStreamTwiml,
  mediaStreamUrl,
};
