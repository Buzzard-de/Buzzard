const { providerFetch } = require("./httpClient");
const { redactObject } = require("../securityGuard");

function sid() {
  return process.env.TELEPHONY_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID || "";
}

function token() {
  return process.env.TELEPHONY_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN || "";
}

function configured() {
  return Boolean(sid() && token());
}

let lastLiveOk = false;

function lastLiveSuccess() {
  return lastLiveOk;
}

async function mintIceServers({ fetchImpl, ttl = 3600 } = {}) {
  if (!configured()) {
    return { ok: false, code: "TURN_PROVIDER_NOT_CONFIGURED", live: false, iceServers: [] };
  }
  const auth = Buffer.from(`${sid()}:${token()}`).toString("base64");
  const body = new URLSearchParams({ Ttl: String(ttl) });
  const result = await providerFetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid()}/Tokens.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
    { breakerName: "twilio-ice", fetchImpl, timeoutMs: 10000 }
  );
  if (!result.ok) {
    lastLiveOk = false;
    return redactObject({
      ok: false,
      code: result.code === "PROVIDER_AUTH_FAILED" ? "TWILIO_AUTH_FAILED" : result.code || "TURN_PROVIDER_ERROR",
      live: false,
      iceServers: [],
      status: result.status,
    });
  }
  const iceServers = result.body?.ice_servers || result.body?.iceServers || [];
  if (!Array.isArray(iceServers) || !iceServers.length) {
    lastLiveOk = false;
    return { ok: false, code: "INVALID_RESPONSE", live: false, iceServers: [] };
  }
  lastLiveOk = true;
  return {
    ok: true,
    live: true,
    provider: "twilio-nts",
    iceServers,
    ttl: Number(result.body?.ttl || ttl),
  };
}

function inspect() {
  return {
    provider: "twilio-nts",
    configured: configured(),
    wired: configured(),
    liveOk: lastLiveOk,
    status: configured() ? (lastLiveOk ? "READY" : "CONFIGURED") : "NOT_CONFIGURED",
  };
}

function resetForTests() {
  lastLiveOk = false;
}

module.exports = { configured, mintIceServers, inspect, lastLiveSuccess, resetForTests };
