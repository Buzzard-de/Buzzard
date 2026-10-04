const { getFlags, isProduction } = require("../flags");
const { PROVIDER_HEALTH } = require("../constants");
const breaker = require("../circuitBreaker");

function configured() {
  return Boolean(process.env.TTS_API_KEY || process.env.OPENAI_API_KEY);
}

function voices() {
  return [
    { id: "de-standard", language: "de" },
    { id: "en-standard", language: "en" },
    { id: "tr-standard", language: "tr" },
    { id: "ar-standard", language: "ar" },
  ];
}

function languages() {
  return ["de", "en", "tr", "ar"];
}

async function synthesize({ text, language } = {}) {
  if (!getFlags().VOICE_ENABLED) {
    return { ok: false, code: "VOICE_DISABLED" };
  }
  if (!configured()) {
    if (!isProduction() && process.env.ALLOW_TTS_TEST_MARKERS === "1") {
      return {
        ok: true,
        mock: true,
        mime: "audio/wav",
        audioBase64: null,
        text: String(text || ""),
        language: language || "de",
        note: "Test marker only — no audio bytes synthesized.",
      };
    }
    return { ok: false, code: "TTS_PROVIDER_NOT_CONFIGURED" };
  }
  if (!breaker.allow("tts")) return { ok: false, code: "CIRCUIT_OPEN" };
  return { ok: false, code: "TTS_PROVIDER_NOT_WIRED", provider: process.env.TTS_PROVIDER || "none" };
}

async function* streamAudio({ text, language } = {}) {
  const result = await synthesize({ text, language });
  yield result;
}

function health() {
  if (!configured()) return PROVIDER_HEALTH.NOT_CONFIGURED;
  return breaker.healthOf("tts");
}

module.exports = {
  synthesize,
  streamAudio,
  voices,
  languages,
  health,
  configured,
};
