/**
 * Optional carrier adapter. Buzzard phone does not require it.
 * Signature check is local. No call is placed.
 */
const crypto = require("crypto");

function secretState() {
  const sid = process.env.BUZZARD_TWILIO_ACCOUNT_SID || "";
  const token = process.env.BUZZARD_TWILIO_AUTH_TOKEN || "";
  const from = process.env.BUZZARD_TWILIO_FROM_NUMBER || "";
  return {
    accountSid: sid ? "set" : "missing",
    authToken: token ? "set" : "missing",
    fromNumber: from ? "set" : "missing",
    configured: Boolean(sid && token && from),
  };
}

function signRequest(url, params, token) {
  const body = String(url) + Object.keys(params).sort().map((key) => `${key}${params[key]}`).join("");
  return crypto.createHmac("sha1", token).update(body).digest("base64");
}

function receiveCall({ url, params = {}, signature = "", token = "", audio = null } = {}) {
  if (!token) return { ok: false, code: "NOT_CONFIGURED", placed: false, live: false };
  const expected = signRequest(url, params, token);
  if (expected.length !== Buffer.byteLength(signature) || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
    return { ok: false, code: "SIGNATURE_INVALID", placed: false, live: false };
  }
  const call = {
    sid: params.CallSid || null,
    from: params.From ? "present" : "missing",
    to: params.To ? "present" : "missing",
    state: "in-progress",
    audioBytes: Buffer.isBuffer(audio) ? audio.length : 0,
    routedTo: "zeynep_hanim",
    coordinator: "pusat",
  };
  return { ok: true, code: "CALL_ACCEPTED", call, placed: false, live: false, network: false, recordingStored: false };
}

function placeCall({ to, transport = null } = {}) {
  const state = secretState();
  if (!state.configured) return { ok: false, code: "NOT_CONFIGURED", placed: false, live: false, ...state };
  if (!to) return { ok: false, code: "DESTINATION_REQUIRED", placed: false, live: false };
  if (!transport) return { ok: false, code: "LIVE_CALLS_FORBIDDEN", placed: false, live: false, network: false };
  return transport({ to, from: "configured" }).then((result) => ({
    ok: false,
    code: "LIVE_CALLS_FORBIDDEN",
    placed: false,
    live: false,
    network: false,
    transportStatus: result?.status || null,
  }));
}

module.exports = { secretState, signRequest, receiveCall, placeCall };
