/**
 * Human STT architecture. Reads real files. Does not transcribe human speech.
 */
const fs = require("fs");
const { validateAudio } = require("./audioValidate");
const { parseWavPcm16 } = require("../speech/acoustics");
const { noiseAnalysis } = require("./sttPipeline");
const { loopback, levenshteinWer } = require("./toneCodec");

function inspectFile(bufferOrPath) {
  const buf = Buffer.isBuffer(bufferOrPath)
    ? bufferOrPath
    : fs.existsSync(bufferOrPath)
      ? fs.readFileSync(bufferOrPath)
      : Buffer.from(bufferOrPath || []);
  const val = validateAudio(buf);
  if (!val.ok) return { ...val, humanStt: false, transcribe: "NOT_IMPLEMENTED" };
  let wav = null;
  if (val.format === "wav") wav = parseWavPcm16(buf);
  const samples = wav && Array.isArray(wav.samples) ? wav.samples : null;
  const durationSec =
    samples && wav.sampleRate
      ? samples.length / wav.sampleRate
      : val.format === "wav"
        ? Math.max(0, (buf.length - 44) / 8000)
        : null;
  return {
    ok: true,
    format: val.format,
    bytes: buf.length,
    durationSec,
    sampleRate: wav && wav.sampleRate ? wav.sampleRate : val.format === "wav" ? 8000 : null,
    bitDepth: wav && wav.bits ? wav.bits : val.format === "wav" ? 8 : null,
    noise: samples ? noiseAnalysis(samples) : null,
    vadIsNotStt: true,
    humanStt: false,
    transcribe: "NOT_IMPLEMENTED",
    languagesResearched: ["tr", "de", "en"],
    licensedHours: 0,
  };
}

function conditionTests() {
  const quiet = loopback({ text: "merhaba", lang: "tr" });
  const de = loopback({ text: "straße", lang: "de" });
  const en = loopback({ text: "hello", lang: "en" });
  const fast = loopback({ text: "hi", lang: "en" });
  return {
    quietWer: quiet.wer,
    deWer: de.wer,
    enWer: en.wer,
    fastWer: fast.wer,
    humanSpeechWer: null,
    note: "WER is tone-codec loopback, not human recordings",
    generalStt: false,
  };
}

module.exports = { inspectFile, conditionTests, levenshteinWer };
