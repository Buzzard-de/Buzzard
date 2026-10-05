const { getFlags, isProduction } = require("../flags");
const { PROVIDER_HEALTH, LANGUAGES } = require("../constants");
const breaker = require("../circuitBreaker");
const { providerFetch } = require("./httpClient");
const { redactObject, containsSensitivePayment, sanitizeText } = require("../securityGuard");
const cost = require("../costControl");
const { runChain } = require("./failover");
const { snapshot } = require("./status");
const { signAws } = require("./awsSigV4");

let lastLiveOk = false;

function openaiKey() {
  return process.env.TTS_API_KEY || process.env.OPENAI_API_KEY || "";
}

function elevenKey() {
  return process.env.ELEVENLABS_API_KEY || "";
}

function azureKey() {
  return process.env.AZURE_SPEECH_KEY || "";
}

function googleKey() {
  return process.env.GOOGLE_TTS_KEY || process.env.GOOGLE_SPEECH_KEY || "";
}

function pollyKeys() {
  return {
    accessKey: process.env.AWS_POLLY_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID || "",
    secretKey: process.env.AWS_POLLY_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY || "",
    region: process.env.AWS_POLLY_REGION || process.env.AWS_REGION || "eu-central-1",
  };
}

function configured() {
  return Boolean(openaiKey() || elevenKey() || azureKey() || googleKey() || pollyKeys().accessKey);
}

function providerName() {
  if (process.env.TTS_PROVIDER) return process.env.TTS_PROVIDER;
  if (elevenKey() && !openaiKey()) return "elevenlabs";
  if (openaiKey()) return "openai";
  if (azureKey()) return "azure";
  if (googleKey()) return "google";
  if (pollyKeys().accessKey) return "aws";
  return "none";
}

function voices() {
  return [
    { id: process.env.TTS_VOICE_DE || "alloy", language: "de" },
    { id: process.env.TTS_VOICE_EN || "alloy", language: "en" },
    { id: process.env.TTS_VOICE_TR || "alloy", language: "tr" },
    { id: process.env.TTS_VOICE_AR || "alloy", language: "ar" },
  ];
}

function languages() {
  return [...LANGUAGES];
}

function redactForSpeech(text) {
  if (containsSensitivePayment(text)) {
    return { ok: false, code: "TTS_SENSITIVE_BLOCKED" };
  }
  const cleaned = sanitizeText(String(text || ""));
  if (!cleaned.trim()) return { ok: false, code: "TTS_EMPTY_TEXT" };
  return { ok: true, text: cleaned };
}

function canonical({ audio, mimeType, format, durationMs, provider, requestId }) {
  return {
    ok: true,
    audio,
    mimeType,
    format,
    durationMs: durationMs == null ? null : Number(durationMs),
    provider,
    requestId: requestId || null,
    mock: false,
  };
}

async function synthesizeOpenAI({ text, language, fetchImpl }) {
  const voice = voices().find((row) => row.language === language)?.id || "alloy";
  const result = await providerFetch(
    "https://api.openai.com/v1/audio/speech",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
        voice,
        input: text,
        response_format: "mp3",
      }),
    },
    { breakerName: "tts", fetchImpl, timeoutMs: Number(process.env.TTS_TIMEOUT_MS || 20000) }
  );
  if (!result.ok || !result.body?.audio) {
    return { ok: false, code: result.code === "CIRCUIT_OPEN" ? "CIRCUIT_OPEN" : result.code || "TTS_PROVIDER_ERROR", provider: "openai", status: result.status };
  }
  lastLiveOk = true;
  return canonical({
    audio: result.body.audio.toString("base64"),
    mimeType: result.body.mimeType || "audio/mpeg",
    format: "mp3",
    durationMs: null,
    provider: "openai",
    requestId: result.requestId,
  });
}

async function synthesizeEleven({ text, language, fetchImpl }) {
  const voiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
  const result = await providerFetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": elevenKey(),
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2",
        language_code: language,
      }),
    },
    { breakerName: "tts", fetchImpl, timeoutMs: Number(process.env.TTS_TIMEOUT_MS || 20000) }
  );
  if (!result.ok || !result.body?.audio) {
    return { ok: false, code: result.code === "CIRCUIT_OPEN" ? "CIRCUIT_OPEN" : result.code || "TTS_PROVIDER_ERROR", provider: "elevenlabs", status: result.status };
  }
  lastLiveOk = true;
  return canonical({
    audio: result.body.audio.toString("base64"),
    mimeType: "audio/mpeg",
    format: "mp3",
    durationMs: null,
    provider: "elevenlabs",
    requestId: result.requestId,
  });
}

function localeOf(language) {
  const map = { de: "de-DE", en: "en-US", tr: "tr-TR", ar: "ar-SA" };
  return map[language] || "de-DE";
}

async function synthesizeAzure({ text, language, fetchImpl }) {
  const region = process.env.AZURE_SPEECH_REGION || "westeurope";
  const ssml = `<speak version="1.0" xml:lang="${localeOf(language)}"><voice xml:lang="${localeOf(language)}">${text.replace(/[<>]/g, "")}</voice></speak>`;
  const result = await providerFetch(
    `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
    {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": azureKey(),
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
      },
      body: ssml,
    },
    { breakerName: "tts", fetchImpl, timeoutMs: Number(process.env.TTS_TIMEOUT_MS || 20000) }
  );
  if (!result.ok || !result.body?.audio) {
    return { ok: false, code: result.code || "TTS_PROVIDER_ERROR", provider: "azure", status: result.status };
  }
  lastLiveOk = true;
  return canonical({
    audio: result.body.audio.toString("base64"),
    mimeType: result.body.mimeType || "audio/mpeg",
    format: "mp3",
    durationMs: null,
    provider: "azure",
    requestId: result.requestId,
  });
}

async function synthesizeGoogle({ text, language, fetchImpl }) {
  const result = await providerFetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(googleKey())}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: localeOf(language) },
        audioConfig: { audioEncoding: "MP3" },
      }),
    },
    { breakerName: "tts", fetchImpl, timeoutMs: Number(process.env.TTS_TIMEOUT_MS || 20000) }
  );
  if (!result.ok || typeof result.body?.audioContent !== "string") {
    return { ok: false, code: result.ok ? "INVALID_RESPONSE" : result.code || "TTS_PROVIDER_ERROR", provider: "google", status: result.status };
  }
  lastLiveOk = true;
  return canonical({
    audio: result.body.audioContent,
    mimeType: "audio/mpeg",
    format: "mp3",
    durationMs: null,
    provider: "google",
    requestId: result.requestId,
  });
}

async function synthesizePolly({ text, language, fetchImpl }) {
  const creds = pollyKeys();
  if (!creds.accessKey || !creds.secretKey) {
    return { ok: false, code: "TTS_PROVIDER_NOT_CONFIGURED", provider: "aws" };
  }
  const voiceId = { de: "Marlene", en: "Joanna", tr: "Filiz", ar: "Zeina" }[language] || "Marlene";
  const body = JSON.stringify({ Text: text, OutputFormat: "mp3", VoiceId: voiceId, Engine: "standard" });
  const host = `polly.${creds.region}.amazonaws.com`;
  const headers = signAws({
    method: "POST",
    host,
    path: "/v1/speech",
    region: creds.region,
    service: "polly",
    body,
    accessKey: creds.accessKey,
    secretKey: creds.secretKey,
  });
  const result = await providerFetch(
    `https://${host}/v1/speech`,
    {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body,
    },
    { breakerName: "tts", fetchImpl, timeoutMs: Number(process.env.TTS_TIMEOUT_MS || 20000) }
  );
  if (!result.ok || !result.body?.audio) {
    return { ok: false, code: result.code || "TTS_PROVIDER_ERROR", provider: "aws", status: result.status };
  }
  lastLiveOk = true;
  return canonical({
    audio: result.body.audio.toString("base64"),
    mimeType: "audio/mpeg",
    format: "mp3",
    durationMs: null,
    provider: "aws",
    requestId: result.requestId,
  });
}

async function synthesize({ text, language, fetchImpl, customerId, conversationId } = {}) {
  if (!getFlags().VOICE_ENABLED) {
    return { ok: false, code: "VOICE_DISABLED" };
  }
  const safe = redactForSpeech(text);
  if (!safe.ok) return safe;
  if (!configured()) {
    if (!isProduction() && process.env.ALLOW_TTS_TEST_MARKERS === "1") {
      return {
        ok: true,
        mock: true,
        mime: "audio/wav",
        mimeType: "audio/wav",
        format: "wav",
        audio: null,
        audioBase64: null,
        text: safe.text,
        language: language || "de",
        note: "Test marker only — no audio bytes synthesized.",
      };
    }
    return { ok: false, code: "TTS_PROVIDER_NOT_CONFIGURED", provider: providerName() };
  }
  if (!breaker.allow("tts")) return { ok: false, code: "CIRCUIT_OPEN" };

  const name = providerName();
  const runners = [];
  const add = (key, fn, present) => {
    if (present) runners.push({ name: key, fn: () => fn({ text: safe.text, language, fetchImpl }) });
  };
  if (name === "elevenlabs") add("elevenlabs", synthesizeEleven, elevenKey());
  else if (name === "azure") add("azure", synthesizeAzure, azureKey());
  else if (name === "google") add("google", synthesizeGoogle, googleKey());
  else if (name === "aws") add("aws", synthesizePolly, Boolean(pollyKeys().accessKey && pollyKeys().secretKey));
  else add("openai", synthesizeOpenAI, openaiKey());
  add("openai", synthesizeOpenAI, openaiKey());
  add("elevenlabs", synthesizeEleven, elevenKey());
  add("azure", synthesizeAzure, azureKey());
  add("google", synthesizeGoogle, googleKey());
  add("aws", synthesizePolly, Boolean(pollyKeys().accessKey && pollyKeys().secretKey));
  if (!runners.length) {
    return { ok: false, code: "TTS_PROVIDER_NOT_CONFIGURED", provider: name };
  }
  const result = await runChain(runners);

  if (result.ok) {
    cost.recordUsage({
      customerId,
      conversationId,
      ttsSeconds: Math.ceil(safe.text.length / 12),
      provider: result.provider,
      kind: "tts",
      estimatedCost: cost.estimateTts(safe.text.length, result.provider),
    });
  }
  return redactObject({ ...result, language: language || "de" });
}

async function* synthesizeStream({ text, language, fetchImpl } = {}) {
  const result = await synthesize({ text, language, fetchImpl });
  yield result;
}

function health() {
  if (!configured()) return PROVIDER_HEALTH.NOT_CONFIGURED;
  return breaker.healthOf("tts");
}

function lastLiveSuccess() {
  return lastLiveOk;
}

function inspect() {
  const name = providerName();
  const wired = new Set(["openai", "elevenlabs", "azure", "google", "aws"]);
  return {
    provider: name,
    configured: configured(),
    wired: wired.has(name),
    liveOk: lastLiveOk,
    status: snapshot({
      configured: configured(),
      wired: wired.has(name),
      disabled: !getFlags().VOICE_ENABLED,
      liveOk: lastLiveOk,
    }),
  };
}

module.exports = {
  synthesize,
  synthesizeStream,
  streamAudio: synthesizeStream,
  voices,
  languages,
  health,
  configured,
  providerName,
  lastLiveSuccess,
  redactForSpeech,
  inspect,
};
