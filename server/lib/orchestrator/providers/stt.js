const { getFlags, isProduction } = require("../flags");
const { PROVIDER_HEALTH } = require("../constants");
const breaker = require("../circuitBreaker");

function configured() {
  return Boolean(process.env.STT_API_KEY || process.env.OPENAI_API_KEY);
}

function providerName() {
  return process.env.STT_PROVIDER || (configured() ? "openai" : "none");
}

async function transcribeAudio({ audio, language, testTranscript } = {}) {
  if (getFlags().VOICE_ENABLED === false) {
    return { ok: false, code: "VOICE_DISABLED" };
  }
  if (!configured()) {
    if (!isProduction() && testTranscript) {
      return {
        ok: true,
        mock: true,
        text: String(testTranscript),
        language: language || "de",
        confidence: 0.9,
        partial: false,
        final: true,
      };
    }
    return { ok: false, code: "STT_PROVIDER_NOT_CONFIGURED" };
  }
  if (!breaker.allow("stt")) return { ok: false, code: "CIRCUIT_OPEN" };
  return { ok: false, code: "STT_PROVIDER_NOT_WIRED", provider: providerName() };
}

async function* streamTranscription({ chunks = [], language } = {}) {
  for (const chunk of chunks) {
    yield { partial: true, final: false, text: String(chunk), language: language || "de" };
  }
  yield { partial: false, final: true, text: chunks.join(" "), language: language || "de" };
}

function detectLanguage(text, fallback = "de") {
  const raw = String(text || "");
  if (/[ğüşöçıİ]/i.test(raw) || /\b(merhaba|lütfen|sipariş)\b/i.test(raw)) return "tr";
  if (/[\u0600-\u06FF]/.test(raw)) return "ar";
  if (/\b(the|please|order|hello)\b/i.test(raw)) return "en";
  return fallback;
}

function health() {
  if (!configured()) return PROVIDER_HEALTH.NOT_CONFIGURED;
  return breaker.healthOf("stt");
}

module.exports = {
  transcribeAudio,
  streamTranscription,
  detectLanguage,
  health,
  configured,
};
