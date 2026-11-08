const { validateAudio, languageHint } = require("./audioValidate");
const { frameEnergy } = require("./frames");
const { decodeWav, loopback } = require("./toneCodec");

function parsePcm16(buffer) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || []);
  const samples = [];
  for (let i = 0; i + 1 < buf.length; i += 2) samples.push(buf.readInt16LE(i) / 32768);
  return samples;
}

function rms(samples) {
  if (!samples.length) return 0;
  return Math.sqrt(samples.reduce((a, b) => a + b * b, 0) / samples.length);
}

function noiseAnalysis(samples) {
  const energy = rms(samples);
  const frames = frameEnergy(samples, 8000, 20);
  const voiced = frames.voiced;
  return {
    rms: energy,
    voicedFrames: voiced,
    silenceRatio: frames.frames.length ? 1 - voiced / frames.frames.length : 1,
    noisy: energy > 0.2,
    stt: false,
  };
}

function pipeline(buffer, { langHint } = {}) {
  const val = validateAudio(buffer);
  if (!val.ok) return { ...val, pipeline: "reject", generalStt: false };
  const pcm = buffer.slice(0, 4).toString("ascii") === "RIFF" ? parsePcm16(buffer.slice(44)) : [];
  const noise = noiseAnalysis(pcm);
  const segs = frameEnergy(pcm, 8000, 20);
  const tone = buffer.slice(0, 4).toString("ascii") === "RIFF" ? decodeWav(buffer) : { ok: false };
  return {
    ok: true,
    validate: val,
    noise,
    segments: segs.voiced,
    languageHint: languageHint(langHint || ""),
    decode: tone.ok ? { phonemes: tone.phonemes, kind: tone.kind } : { kind: "NO_TONE_DECODE" },
    timestamps: segs.frames.slice(0, 8).map((f) => ({ i: f.i, voiceLikely: f.voiceLikely })),
    speakerSplit: "NOT_IMPLEMENTED",
    confidence: tone.ok ? 0.7 : 0.2,
    generalStt: false,
    transcribeHuman: "NOT_IMPLEMENTED",
  };
}

function evalLanguages() {
  const phrases = {
    tr: "merhaba",
    de: "hallo",
    en: "hello",
  };
  const rows = Object.entries(phrases).map(([lang, text]) => ({ lang, ...loopback({ text, lang }) }));
  return {
    rows,
    meanWer: rows.reduce((a, r) => a + r.wer, 0) / rows.length,
    generalStt: false,
    licensedSpeechHours: 0,
  };
}

module.exports = { pipeline, noiseAnalysis, evalLanguages };
