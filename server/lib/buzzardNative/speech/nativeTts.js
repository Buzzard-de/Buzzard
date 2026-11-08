/**
 * Native TTS prototype: G2P + timed tones. Not Sinan Bey's official voice.
 */
const { wavTone } = require("./wavTone");
const { VOICE_ID } = require("./voiceIdentity");

const TR = { ç: "tʃ", ğ: "ː", ı: "ɯ", ö: "ø", ş: "ʃ", ü: "y", a: "a", e: "e", i: "i", o: "o", u: "u" };
const DE = { ä: "ɛ", ö: "ø", ü: "y", ß: "s", a: "a", e: "e", i: "i", o: "o", u: "u" };
const EN = { a: "æ", e: "ɛ", i: "ɪ", o: "ɒ", u: "ʌ" };

function g2p(text, lang = "tr") {
  const map = lang === "de" ? DE : lang === "en" ? EN : TR;
  const phonemes = [];
  for (const ch of String(text).toLowerCase()) {
    if (map[ch]) phonemes.push(map[ch]);
    else if (/\s/.test(ch)) phonemes.push("_");
    else if (/[a-z]/.test(ch)) phonemes.push(ch);
  }
  return { lang, phonemes, completeLexicon: false, neural: false };
}

function protoSynth({ text, lang = "tr" } = {}) {
  const { phonemes } = g2p(text, lang);
  const ms = Math.min(400, 40 + phonemes.length * 8);
  const wav = wavTone({ hz: 110, ms });
  return {
    ok: true,
    kind: "PROTO_TONE_CHAIN_NOT_OFFICIAL_VOICE",
    voiceId: VOICE_ID,
    officialVoiceUsed: false,
    liveTts: false,
    naturalHumanClaim: false,
    bytes: wav.length,
    phonemes: phonemes.slice(0, 24),
    lang,
  };
}

function quality() {
  return {
    pronunciation: "UNKNOWN",
    intelligibility: "UNKNOWN",
    character: "NOT_SINAN_OFFICIAL",
    naturalness: "NOT_MEASURED",
    pitch: "TEST_TONE_110HZ",
    rate: "UNKNOWN",
    pause: "UNKNOWN",
    stress: "UNKNOWN",
    quality: "NOT_HUMAN",
    officialVoice: false,
  };
}

const TEST_TEXTS = Object.freeze({
  tr: "Her yeni günde, güneşin doğuşuyla beraber dünyayı sevenlerin mücadelesi başlar. Karanlığın ardından doğan güneş, herkese hayat ve enerji verirken hayaller kuranlara ise daima yol gösterir.",
  de: "Ein neuer Tag beginnt mit neuen Möglichkeiten. Jeder Schritt bringt uns unseren Zielen näher.",
  en: "Every new day brings new opportunities and new possibilities.",
});

function councilVoiceCopyGuard({ fromId, toId }) {
  if (fromId === "sinan_bey" && toId && toId !== "sinan_bey") {
    return { ok: false, code: "VOICE_IDENTITY_NOT_COPYABLE" };
  }
  return { ok: true };
}

module.exports = { g2p, protoSynth, quality, TEST_TEXTS, councilVoiceCopyGuard };
