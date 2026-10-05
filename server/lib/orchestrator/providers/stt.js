const { getFlags, isProduction } = require("../flags");
const { PROVIDER_HEALTH, LANGUAGES } = require("../constants");
const breaker = require("../circuitBreaker");
const { providerFetch } = require("./httpClient");
const { normalizeAudio } = require("./audio");
const cost = require("../costControl");
const { runChain } = require("./failover");
const { snapshot } = require("./status");

let lastLiveOk = false;

function openaiKey() {
  return process.env.STT_API_KEY || process.env.OPENAI_API_KEY || "";
}

function deepgramKey() {
  return process.env.DEEPGRAM_API_KEY || "";
}

const WIRED_STT = new Set(["openai", "whisper", "deepgram", "azure", "google"]);

function azureKey() {
  return process.env.AZURE_SPEECH_KEY || "";
}

function googleKey() {
  return process.env.GOOGLE_SPEECH_KEY || process.env.GOOGLE_STT_KEY || "";
}

function configured() {
  return Boolean(openaiKey() || deepgramKey() || azureKey() || googleKey() || process.env.AWS_TRANSCRIBE_ACCESS_KEY);
}

function providerName() {
  if (process.env.STT_PROVIDER) return process.env.STT_PROVIDER;
  if (deepgramKey() && !openaiKey()) return "deepgram";
  if (openaiKey()) return "openai";
  if (azureKey()) return "azure";
  if (googleKey()) return "google";
  if (process.env.AWS_TRANSCRIBE_ACCESS_KEY) return "aws";
  return "none";
}

function detectLanguage(text, fallback = "de") {
  const raw = String(text || "");
  if (/[ğüşöçıİ]/i.test(raw) || /\b(merhaba|lütfen|sipariş|teşekkür)\b/i.test(raw)) return "tr";
  if (/[\u0600-\u06FF]/.test(raw)) return "ar";
  if (/\b(the|please|order|hello|thanks)\b/i.test(raw)) return "en";
  if (/\b(bitte|danke|bestellung|hallo)\b/i.test(raw)) return "de";
  const short = String(fallback || "de").slice(0, 2).toLowerCase();
  return LANGUAGES.includes(short) ? short : "de";
}

function canonical({ transcript, language, confidence, durationMs, provider, requestId }) {
  return {
    ok: true,
    transcript,
    text: transcript,
    language,
    confidence: confidence == null ? null : Number(confidence),
    durationMs: durationMs == null ? null : Number(durationMs),
    provider,
    requestId: requestId || null,
    partial: false,
    final: true,
    mock: false,
  };
}

async function transcribeOpenAI({ audio, language, fetchImpl }) {
  const form = new FormData();
  const blob = new Blob([audio.buf], { type: audio.mime });
  form.append("file", blob, audio.filename || "audio.webm");
  form.append("model", process.env.OPENAI_STT_MODEL || "whisper-1");
  if (language) form.append("language", language);
  form.append("response_format", "verbose_json");
  const result = await providerFetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey()}` },
      body: form,
    },
    { breakerName: "stt", fetchImpl, timeoutMs: Number(process.env.STT_TIMEOUT_MS || 20000) }
  );
  if (!result.ok) {
    return { ok: false, code: result.code === "CIRCUIT_OPEN" ? "CIRCUIT_OPEN" : result.code || "STT_PROVIDER_ERROR", provider: "openai", status: result.status };
  }
  const transcript = result.body?.text;
  if (typeof transcript !== "string") {
    return { ok: false, code: "INVALID_RESPONSE", provider: "openai", status: result.status };
  }
  lastLiveOk = true;
  return canonical({
    transcript,
    language: result.body?.language || language || detectLanguage(transcript),
    confidence: result.body?.duration ? 0.9 : null,
    durationMs: result.body?.duration != null ? Math.round(Number(result.body.duration) * 1000) : audio.durationMs,
    provider: "openai",
    requestId: result.requestId,
  });
}

async function transcribeDeepgram({ audio, language, fetchImpl }) {
  const qs = new URLSearchParams({
    model: process.env.DEEPGRAM_MODEL || "nova-2",
    smart_format: "true",
  });
  if (language) qs.set("language", language);
  const result = await providerFetch(
    `https://api.deepgram.com/v1/listen?${qs}`,
    {
      method: "POST",
      headers: {
        Authorization: `Token ${deepgramKey()}`,
        "Content-Type": audio.mime || "audio/webm",
      },
      body: audio.buf,
    },
    { breakerName: "stt", fetchImpl, timeoutMs: Number(process.env.STT_TIMEOUT_MS || 20000) }
  );
  if (!result.ok) {
    return { ok: false, code: result.code === "CIRCUIT_OPEN" ? "CIRCUIT_OPEN" : result.code || "STT_PROVIDER_ERROR", provider: "deepgram", status: result.status };
  }
  const alt = result.body?.results?.channels?.[0]?.alternatives?.[0];
  if (!alt || typeof alt.transcript !== "string") {
    return { ok: false, code: "INVALID_RESPONSE", provider: "deepgram", status: result.status };
  }
  lastLiveOk = true;
  return canonical({
    transcript: alt.transcript,
    language: language || detectLanguage(alt.transcript),
    confidence: alt.confidence,
    durationMs: audio.durationMs,
    provider: "deepgram",
    requestId: result.requestId,
  });
}

function localeOf(language) {
  const map = { de: "de-DE", en: "en-US", tr: "tr-TR", ar: "ar-SA" };
  return map[language] || "de-DE";
}

async function transcribeAzure({ audio, language, fetchImpl }) {
  const region = process.env.AZURE_SPEECH_REGION || "westeurope";
  const result = await providerFetch(
    `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${encodeURIComponent(localeOf(language))}`,
    {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": azureKey(),
        "Content-Type": audio.mime || "audio/wav",
        Accept: "application/json",
      },
      body: audio.buf,
    },
    { breakerName: "stt", fetchImpl, timeoutMs: Number(process.env.STT_TIMEOUT_MS || 20000) }
  );
  if (!result.ok) {
    return { ok: false, code: result.code === "CIRCUIT_OPEN" ? "CIRCUIT_OPEN" : result.code || "STT_PROVIDER_ERROR", provider: "azure", status: result.status };
  }
  const transcript = result.body?.DisplayText ?? result.body?.NBest?.[0]?.Display;
  if (typeof transcript !== "string") {
    return { ok: false, code: "INVALID_RESPONSE", provider: "azure" };
  }
  lastLiveOk = true;
  return canonical({
    transcript,
    language: language || detectLanguage(transcript),
    confidence: result.body?.NBest?.[0]?.Confidence,
    durationMs: audio.durationMs,
    provider: "azure",
    requestId: result.requestId,
  });
}

async function transcribeGoogle({ audio, language, fetchImpl }) {
  const result = await providerFetch(
    `https://speech.googleapis.com/v1/speech:recognize?key=${encodeURIComponent(googleKey())}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        config: {
          languageCode: localeOf(language),
          encoding: "WEBM_OPUS",
        },
        audio: { content: audio.buf.toString("base64") },
      }),
    },
    { breakerName: "stt", fetchImpl, timeoutMs: Number(process.env.STT_TIMEOUT_MS || 20000) }
  );
  if (!result.ok) {
    return { ok: false, code: result.code === "CIRCUIT_OPEN" ? "CIRCUIT_OPEN" : result.code || "STT_PROVIDER_ERROR", provider: "google", status: result.status };
  }
  const transcript = result.body?.results?.[0]?.alternatives?.[0]?.transcript;
  if (typeof transcript !== "string") {
    return { ok: false, code: "INVALID_RESPONSE", provider: "google" };
  }
  lastLiveOk = true;
  return canonical({
    transcript,
    language: language || detectLanguage(transcript),
    confidence: result.body?.results?.[0]?.alternatives?.[0]?.confidence,
    durationMs: audio.durationMs,
    provider: "google",
    requestId: result.requestId,
  });
}

async function transcribeAudio({ audio, language, testTranscript, fetchImpl } = {}) {
  return transcribe({ audio, language, testTranscript, fetchImpl });
}

async function transcribe({ audio, language, testTranscript, fetchImpl, customerId, conversationId } = {}) {
  if (getFlags().VOICE_ENABLED === false) {
    return { ok: false, code: "VOICE_DISABLED" };
  }
  if (!configured()) {
    if (!isProduction() && testTranscript) {
      return {
        ok: true,
        mock: true,
        transcript: String(testTranscript),
        text: String(testTranscript),
        language: language || detectLanguage(testTranscript),
        confidence: 0.9,
        durationMs: null,
        provider: "test",
        requestId: null,
        partial: false,
        final: true,
      };
    }
    return { ok: false, code: "STT_PROVIDER_NOT_CONFIGURED", provider: providerName() };
  }
  if (testTranscript && isProduction()) {
    return { ok: false, code: "STT_TEST_MARKER_FORBIDDEN" };
  }
  if (!breaker.allow("stt")) return { ok: false, code: "CIRCUIT_OPEN" };

  const name = providerName();
  const normalized = normalizeAudio(audio);
  if (!normalized.ok) return normalized;

  if (name === "aws") {
    return { ok: false, code: "STT_PROVIDER_NOT_WIRED", provider: "aws" };
  }

  const runners = [];
  const add = (key, fn, present) => {
    if (present) runners.push({ name: key, fn: () => fn({ audio: normalized, language, fetchImpl }) });
  };
  if (name === "deepgram") add("deepgram", transcribeDeepgram, deepgramKey());
  else if (name === "azure") add("azure", transcribeAzure, azureKey());
  else if (name === "google") add("google", transcribeGoogle, googleKey());
  else add("openai", transcribeOpenAI, openaiKey());
  add("openai", transcribeOpenAI, openaiKey());
  add("deepgram", transcribeDeepgram, deepgramKey());
  add("azure", transcribeAzure, azureKey());
  add("google", transcribeGoogle, googleKey());

  if (!runners.length) {
    return { ok: false, code: "STT_PROVIDER_NOT_CONFIGURED", provider: name };
  }
  const result = await runChain(runners);

  if (result.ok) {
    cost.recordUsage({
      customerId,
      conversationId,
      sttSeconds: (result.durationMs || 0) / 1000,
      provider: result.provider,
      kind: "stt",
      estimatedCost: cost.estimateStt(result.durationMs || 0, result.provider),
    });
  }
  return result;
}

async function* transcribeStream({ chunks = [], language, audio, fetchImpl } = {}) {
  if (!configured()) {
    yield { ok: false, code: "STT_PROVIDER_NOT_CONFIGURED", partial: false, final: true };
    return;
  }
  if (chunks.length) {
    let acc = "";
    for (const chunk of chunks) {
      acc = `${acc} ${chunk}`.trim();
      yield { ok: true, partial: true, final: false, transcript: acc, text: acc, language: language || "de" };
    }
    yield { ok: true, partial: false, final: true, transcript: acc, text: acc, language: language || "de" };
    return;
  }
  const full = await transcribe({ audio, language, fetchImpl });
  if (full.ok) {
    yield { ...full, partial: true, final: false };
    yield { ...full, partial: false, final: true };
  } else {
    yield full;
  }
}

function health() {
  if (!configured()) return PROVIDER_HEALTH.NOT_CONFIGURED;
  return breaker.healthOf("stt");
}

function lastLiveSuccess() {
  return lastLiveOk;
}

function inspect() {
  const name = providerName();
  return {
    provider: name,
    configured: configured(),
    wired: WIRED_STT.has(name),
    liveOk: lastLiveOk,
    status: snapshot({
      configured: configured(),
      wired: name === "aws" ? false : WIRED_STT.has(name) || configured(),
      disabled: getFlags().VOICE_ENABLED === false,
      liveOk: lastLiveOk,
    }),
  };
}

module.exports = {
  transcribe,
  transcribeAudio,
  transcribeStream,
  streamTranscription: transcribeStream,
  detectLanguage,
  health,
  configured,
  providerName,
  lastLiveSuccess,
  inspect,
  WIRED_STT,
};
