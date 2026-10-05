const stt = require("./stt");
const tts = require("./tts");
const telephony = require("./telephony");
const webrtc = require("./webrtc");
const { providerFetch } = require("./httpClient");
const { snapshot, fromHttp } = require("./status");
const { getFlags } = require("../flags");

function safeMeta({ provider, configured, wired, http, liveOk, disabled }) {
  return {
    provider,
    configured: Boolean(configured),
    wired: Boolean(wired),
    reachable: http ? http.status > 0 || http.ok : null,
    authenticated: http ? Boolean(http.ok) : null,
    status: snapshot({
      configured,
      wired,
      disabled,
      probed: Boolean(http),
      probeOk: Boolean(http?.ok),
      liveOk,
      http,
    }),
    latencyMs: http?.latencyMs ?? null,
    lastCheckedAt: http ? new Date().toISOString() : null,
    errorCode: http && !http.ok ? http.code || fromHttp(http) : null,
  };
}

async function timedFetch(url, init, fetchImpl) {
  const started = Date.now();
  const result = await providerFetch(url, init, {
    fetchImpl,
    timeoutMs: 8000,
    attempts: 1,
  });
  return { ...result, latencyMs: Date.now() - started };
}

async function probeStt({ fetchImpl } = {}) {
  const inspection = stt.inspect();
  if (!inspection.configured) return safeMeta({ ...inspection, disabled: !getFlags().VOICE_ENABLED, liveOk: stt.lastLiveSuccess() });
  if (!inspection.wired) return safeMeta({ ...inspection, disabled: !getFlags().VOICE_ENABLED, liveOk: false });
  const name = inspection.provider;
  let http = null;
  if (name === "openai" || name === "whisper") {
    http = await timedFetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${process.env.STT_API_KEY || process.env.OPENAI_API_KEY}` },
    }, fetchImpl);
  } else if (name === "deepgram") {
    http = await timedFetch("https://api.deepgram.com/v1/projects", {
      headers: { Authorization: `Token ${process.env.DEEPGRAM_API_KEY}` },
    }, fetchImpl);
  } else if (name === "azure") {
    const region = process.env.AZURE_SPEECH_REGION || "westeurope";
    http = await timedFetch(`https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
      method: "POST",
      headers: { "Ocp-Apim-Subscription-Key": process.env.AZURE_SPEECH_KEY },
    }, fetchImpl);
  } else if (name === "google") {
    http = await timedFetch(
      `https://speech.googleapis.com/v1/operations?key=${encodeURIComponent(process.env.GOOGLE_SPEECH_KEY || process.env.GOOGLE_STT_KEY || "")}`,
      {},
      fetchImpl
    );
  }
  return safeMeta({ ...inspection, http, disabled: !getFlags().VOICE_ENABLED, liveOk: stt.lastLiveSuccess() });
}

async function probeTts({ fetchImpl } = {}) {
  const inspection = tts.inspect();
  if (!inspection.configured || !inspection.wired) {
    return safeMeta({ ...inspection, disabled: !getFlags().VOICE_ENABLED, liveOk: tts.lastLiveSuccess() });
  }
  let http = null;
  if (inspection.provider === "openai") {
    http = await timedFetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${process.env.TTS_API_KEY || process.env.OPENAI_API_KEY}` },
    }, fetchImpl);
  } else if (inspection.provider === "elevenlabs") {
    http = await timedFetch("https://api.elevenlabs.io/v1/user", {
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY },
    }, fetchImpl);
  }
  return safeMeta({ ...inspection, http, disabled: !getFlags().VOICE_ENABLED, liveOk: tts.lastLiveSuccess() });
}

async function probeTelephony({ fetchImpl } = {}) {
  const inspection = telephony.inspect();
  if (!inspection.configured || !inspection.wired) {
    return safeMeta({ ...inspection, disabled: !getFlags().PHONE_ENABLED, liveOk: telephony.lastLiveSuccess() });
  }
  let http = null;
  if (inspection.provider === "twilio") {
    const sid = process.env.TELEPHONY_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TELEPHONY_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN;
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    http = await timedFetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
      headers: { Authorization: `Basic ${auth}` },
    }, fetchImpl);
  }
  return safeMeta({ ...inspection, http, disabled: !getFlags().PHONE_ENABLED, liveOk: telephony.lastLiveSuccess() });
}

function inspectAll() {
  return {
    stt: stt.inspect(),
    tts: tts.inspect(),
    telephony: telephony.inspect(),
    webrtc: webrtc.inspect(),
  };
}

async function probeAll(opts) {
  const [sttH, ttsH, phoneH] = await Promise.all([probeStt(opts), probeTts(opts), probeTelephony(opts)]);
  return { stt: sttH, tts: ttsH, telephony: phoneH, webrtc: webrtc.inspect() };
}

module.exports = {
  inspectAll,
  probeAll,
  probeStt,
  probeTts,
  probeTelephony,
  safeMeta,
};
