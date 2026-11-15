/**
 * Closed-set tone codec. Encodes G2P phonemes as sine bursts and decodes them.
 * This is not general speech recognition of human recordings.
 */
const { wavTone } = require("../speech/wavTone");
const { g2p } = require("../speech/nativeTts");

const RATE = 8000;
const MS = 40;
const BASE = 300;
const STEP = 40;

const PHONES = Object.freeze([
  "a", "e", "i", "o", "u", "ɯ", "ø", "y", "tʃ", "ʃ", "ɛ", "æ", "ɪ", "ɒ", "ʌ", "_",
  "n", "s", "r", "l", "m", "t", "k", "d", "b", "h", "c", "g", "j", "p", "v", "w", "z", "f", "q", "x", "ç", "ğ", "ş", "ı",
]);

function hzFor(phoneme) {
  const idx = PHONES.indexOf(phoneme);
  const i = idx >= 0 ? idx : PHONES.length;
  return BASE + i * STEP;
}

function table() {
  const map = {};
  for (const p of PHONES) map[hzFor(p)] = p;
  return map;
}

function encodePhonemes(phonemes) {
  const chunks = phonemes.map((p) => wavTone({ hz: hzFor(p), ms: MS }).slice(44));
  const data = Buffer.concat(chunks);
  const header = wavTone({ hz: 440, ms: 10 }).slice(0, 44);
  header.writeUInt32LE(36 + data.length, 4);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

function dominantHz(frame, rate) {
  let best = 0;
  let mag = -1;
  for (let hz = BASE; hz <= BASE + 39 * STEP; hz += STEP) {
    let re = 0;
    let im = 0;
    const w = (2 * Math.PI * hz) / rate;
    for (let i = 0; i < frame.length; i += 1) {
      const x = (frame[i] - 128) / 128;
      re += x * Math.cos(w * i);
      im -= x * Math.sin(w * i);
    }
    const m = Math.hypot(re, im);
    if (m > mag) {
      mag = m;
      best = hz;
    }
  }
  return best;
}

function decodeWav(buf) {
  if (!Buffer.isBuffer(buf) || buf.slice(0, 4).toString("ascii") !== "RIFF") {
    return { ok: false, code: "UNSUPPORTED_OR_CORRUPT_AUDIO", stt: false };
  }
  const pcm = buf.slice(44);
  const hop = Math.floor((RATE * MS) / 1000);
  const hzMap = table();
  const phonemes = [];
  for (let i = 0; i + hop <= pcm.length; i += hop) {
    const hz = dominantHz(pcm.slice(i, i + hop), RATE);
    phonemes.push(hzMap[hz] || "?");
  }
  return { ok: true, phonemes, kind: "TONE_CODEC_NOT_GENERAL_STT", sttGeneral: false };
}

function loopback({ text, lang = "tr" } = {}) {
  const { phonemes } = g2p(text, lang);
  const seq = phonemes.filter((p) => p).slice(0, 16);
  const wav = encodePhonemes(seq);
  const dec = decodeWav(wav);
  const got = (dec.phonemes || []).slice(0, seq.length);
  let err = 0;
  for (let i = 0; i < seq.length; i += 1) if (got[i] !== seq[i]) err += 1;
  const wer = seq.length ? err / seq.length : 1;
  return {
    ok: dec.ok,
    lang,
    expected: seq,
    got,
    wer,
    cer: wer,
    kind: "TONE_CODEC_NOT_GENERAL_STT",
    generalStt: false,
    bytes: wav.length,
  };
}

function levenshteinWer(ref, hyp) {
  const a = ref;
  const b = hyp;
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return m ? dp[m][n] / m : 1;
}

module.exports = { encodePhonemes, decodeWav, loopback, hzFor, levenshteinWer };
