const { getFlags, isProduction } = require("../flags");
const { PROVIDER_HEALTH, LANGUAGES } = require("../constants");
const breaker = require("../circuitBreaker");
const { providerFetch } = require("./httpClient");
const { redactObject, containsSensitivePayment, sanitizeText } = require("../securityGuard");
const cost = require("../costControl");

let lastLiveOk = false;

function openaiKey() {
  return process.env.TTS_API_KEY || process.env.OPENAI_API_KEY || "";
}

function elevenKey() {
  return process.env.ELEVENLABS_API_KEY || "";
}

function configured() {
  return Boolean(
    openaiKey() ||
      elevenKey() ||
      process.env.AZURE_SPEECH_KEY ||
      process.env.AWS_POLLY_ACCESS_KEY ||
      process.env.GOOGLE_TTS_KEY
  );
}

function providerName() {
  if (process.env.TTS_PROVIDER) return process.env.TTS_PROVIDER;
  if (elevenKey() && !openaiKey()) return "elevenlabs";
  if (openaiKey()) return "openai";
  if (process.env.AZURE_SPEECH_KEY) return "azure";
  if (process.env.AWS_POLLY_ACCESS_KEY) return "aws";
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
    return { ok: false, code: result.code === "CIRCUIT_OPEN" ? "CIRCUIT_OPEN" : "TTS_PROVIDER_ERROR", provider: "openai", status: result.status };
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
    return { ok: false, code: result.code === "CIRCUIT_OPEN" ? "CIRCUIT_OPEN" : "TTS_PROVIDER_ERROR", provider: "elevenlabs", status: result.status };
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
  let result;
  if (name === "elevenlabs" && elevenKey()) {
    result = await synthesizeEleven({ text: safe.text, language, fetchImpl });
  } else if (name === "openai" && openaiKey()) {
    result = await synthesizeOpenAI({ text: safe.text, language, fetchImpl });
  } else if (["azure", "aws", "google"].includes(name)) {
    return { ok: false, code: "TTS_PROVIDER_NOT_WIRED", provider: name };
  } else if (openaiKey()) {
    result = await synthesizeOpenAI({ text: safe.text, language, fetchImpl });
  } else if (elevenKey()) {
    result = await synthesizeEleven({ text: safe.text, language, fetchImpl });
  } else {
    return { ok: false, code: "TTS_PROVIDER_NOT_CONFIGURED", provider: name };
  }

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
};
