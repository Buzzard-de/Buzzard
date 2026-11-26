/**
 * Local speech on the existing voice engine.
 * Piper synthesizes speech. Whisper transcribes it. Neither path is the tone lexicon.
 */
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { canUse } = require("../buzzardNative/core/capabilityRegistry");

const VOICES = Object.freeze({
  tr: { file: "tr_TR-dfki-medium.onnx", lang: "tr", license: "Apache-2.0" },
  de: { file: "de_DE-kerstin-low.onnx", lang: "de", license: "Apache-2.0" },
  en: { file: "en_US-lessac-medium.onnx", lang: "en", license: "Apache-2.0" },
});

const SCALES = Object.freeze({
  pusat: 0.9,
  sinan_bey: 0.96,
  esat_bey: 1.02,
  dogu_bey: 1.08,
  nedim_bey: 1.14,
  tuncay_bey: 0.93,
  amelia: 1.05,
  adrian: 1.11,
  mira: 0.98,
  leon: 1.16,
  category_ai: 1.0,
  pricing_ai: 1.07,
  seo_ai: 0.94,
  banu_hanim: 1.12,
  sales_analysis_ai: 1.03,
  zeynep_hanim: 1.18,
});

function speechDir() {
  return path.join(process.cwd(), "data", "models", "speech");
}

function piperBin() {
  const candidate = path.join(process.cwd(), "tools", "piper", "piper", "piper");
  return fs.existsSync(candidate) ? candidate : null;
}

function whisperBin() {
  const candidate = path.join(process.cwd(), "tools", "whisper", "whisper-bin-ubuntu-x64", "whisper-cli");
  return fs.existsSync(candidate) ? candidate : null;
}

function voiceFor(agentId, lang = "tr") {
  if (!canUse(agentId, "speech")) {
    return { ok: false, code: "SPEECH_DENIED", agentId, speech: false };
  }
  const scale = SCALES[agentId] || 1;
  return {
    ok: true,
    agentId,
    voiceId: `${agentId}_piper_${lang}_${scale}`,
    lang,
    lengthScale: scale,
    noiseScale: 0.5 + ((scale * 10) % 3) / 10,
    speech: true,
    cloneAuthorized: false,
  };
}

function speakNatural({ text, lang = "tr", agentId = "pusat" } = {}) {
  const identity = voiceFor(agentId, lang);
  if (!identity.ok) return { ...identity, naturalSpeech: false, audio: false };
  const bin = piperBin();
  const model = path.join(speechDir(), (VOICES[lang] || VOICES.tr).file);
  if (!bin || !fs.existsSync(model)) {
    return { ok: false, code: "NATURAL_SPEECH_NOT_CONFIGURED", naturalSpeech: false, audio: false, paid: false };
  }
  const out = path.join(os.tmpdir(), `buzzard-${crypto.randomBytes(4).toString("hex")}.wav`);
  const ran = spawnSync(bin, [
    "--model", model,
    "--output_file", out,
    "--length_scale", String(identity.lengthScale),
    "--noise_scale", String(identity.noiseScale),
  ], {
    input: `${text}\n`,
    encoding: "utf8",
    timeout: 20000,
    env: { ...process.env, LD_LIBRARY_PATH: `${path.dirname(bin)}:${process.env.LD_LIBRARY_PATH || ""}` },
  });
  if (ran.status !== 0 || !fs.existsSync(out)) {
    return { ok: false, code: "TTS_FAILED", naturalSpeech: false, audio: false, paid: false };
  }
  const wav = fs.readFileSync(out);
  fs.unlinkSync(out);
  return {
    ok: wav.length > 44,
    code: "NATURAL_TTS",
    naturalSpeech: true,
    generalSpeech: false,
    toneCodec: false,
    audio: true,
    wav,
    bytes: wav.length,
    sha256: crypto.createHash("sha256").update(wav).digest("hex"),
    voiceId: identity.voiceId,
    agentId,
    lang,
    paid: false,
    hostedProvider: null,
    officialVoiceUsed: false,
  };
}

function recognizeNatural({ wav, lang = "tr" } = {}) {
  const bin = whisperBin();
  const model = path.join(speechDir(), "ggml-small.bin");
  if (!bin || !fs.existsSync(model)) {
    return { ok: false, code: "NATURAL_SPEECH_NOT_CONFIGURED", transcript: null, generalSpeech: false, paid: false };
  }
  if (!Buffer.isBuffer(wav) || wav.length < 44) {
    return { ok: false, code: "AUDIO_REQUIRED", transcript: null, generalSpeech: false };
  }
  const file = path.join(os.tmpdir(), `buzzard-hear-${crypto.randomBytes(4).toString("hex")}.wav`);
  fs.writeFileSync(file, wav);
  const ran = spawnSync(bin, ["-m", model, "-f", file, "-l", lang, "-nt", "--no-timestamps"], {
    encoding: "utf8",
    timeout: 60000,
    env: { ...process.env, LD_LIBRARY_PATH: `${path.dirname(bin)}:${process.env.LD_LIBRARY_PATH || ""}` },
  });
  fs.unlinkSync(file);
  const transcript = String(ran.stdout || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("[") && !line.startsWith("main:") && !line.startsWith("whisper_"))
    .pop() || "";
  if (ran.status !== 0 || !transcript) {
    return { ok: false, code: "STT_FAILED", transcript: null, generalSpeech: false, paid: false };
  }
  return {
    ok: true,
    code: "NATURAL_STT",
    transcript,
    lang,
    generalSpeech: true,
    lexicon: false,
    toneCodec: false,
    paid: false,
    hostedProvider: null,
    model: "whisper-small",
  };
}

module.exports = { VOICES, voiceFor, speakNatural, recognizeNatural, piperBin, whisperBin };
