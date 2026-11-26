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
const { getAgent } = require("../buzzardNative/core/identityRegistry");

const SOURCE = "https://huggingface.co/rhasspy/piper-voices";
const LICENSE = "NOT_IN_MODEL_CARD";

const VOICES = Object.freeze({
  tr: { file: "tr_TR-dfki-medium.onnx", lang: "tr", speaker: "dfki", license: LICENSE, source: SOURCE },
  de: { file: "de_DE-kerstin-low.onnx", lang: "de", speaker: "kerstin", license: LICENSE, source: SOURCE },
  en: { file: "en_US-lessac-medium.onnx", lang: "en", speaker: "lessac", license: LICENSE, source: SOURCE },
});

const PROFILES = Object.freeze({
  pusat: { file: "tr_TR-dfki-medium.onnx", speaker: "dfki", dataset: "dfki" },
  sinan_bey: { file: "de_DE-karlsson-low.onnx", speaker: "karlsson", dataset: "karlsson" },
  esat_bey: { file: "de_DE-pavoque-low.onnx", speaker: "pavoque", dataset: "pavoque" },
  dogu_bey: { file: "en_US-ryan-low.onnx", speaker: "ryan", dataset: "ryan" },
  nedim_bey: { file: "en_GB-alan-low.onnx", speaker: "alan", dataset: "alan" },
  tuncay_bey: { file: "en_US-danny-low.onnx", speaker: "danny", dataset: "danny" },
  amelia: { file: "de_DE-eva_k-x_low.onnx", speaker: "eva_k", dataset: "eva_k" },
  adrian: { file: "en_US-lessac-medium.onnx", speaker: "lessac", dataset: "lessac" },
  mira: { file: "en_US-amy-low.onnx", speaker: "amy", dataset: "amy" },
  leon: { file: "en_US-ljspeech-medium.onnx", speaker: "ljspeech", dataset: "ljspeech" },
  banu_hanim: { file: "en_US-kristin-medium.onnx", speaker: "kristin", dataset: "kristin" },
  zeynep_hanim: { file: "de_DE-kerstin-low.onnx", speaker: "kerstin", dataset: "kerstin" },
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
  const profile = PROFILES[agentId];
  if (!profile) return { ok: false, code: "VOICE_PROFILE_MISSING", agentId, speech: true };
  const registry = getAgent(agentId)?.voice_profile || null;
  const officialFile = registry?.officialSinan ? registry.file : null;
  return {
    ok: true,
    agentId,
    voiceId: `${agentId}_${profile.speaker}`,
    registryVoiceId: registry?.voice_profile_id || null,
    lang,
    modelFile: profile.file,
    speaker: profile.speaker,
    dataset: profile.dataset,
    license: LICENSE,
    source: SOURCE,
    lengthScale: 1,
    noiseScale: 0.667,
    scaleOnly: false,
    speech: true,
    cloneAuthorized: false,
    officialReference: officialFile,
    officialVoiceUsed: false,
    referenceMixedIntoTts: false,
    probe: "Deneme. exit 0",
  };
}

function speakNatural({ text, lang = "tr", agentId = "pusat", languageVoice = false } = {}) {
  const language = VOICES[lang] || VOICES.tr;
  const identity = languageVoice
    ? {
      ok: true,
      agentId,
      voiceId: `lang_${language.speaker}`,
      modelFile: language.file,
      lengthScale: 1,
      noiseScale: 0.667,
      speech: true,
      officialVoiceUsed: false,
      scaleOnly: false,
    }
    : voiceFor(agentId, lang);
  if (!identity.ok) return { ...identity, naturalSpeech: false, audio: false };
  const bin = piperBin();
  const model = path.join(speechDir(), identity.modelFile);
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
    modelFile: identity.modelFile,
    speaker: identity.speaker || null,
    scaleOnly: false,
    officialVoiceUsed: false,
    referenceMixedIntoTts: false,
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

module.exports = { VOICES, PROFILES, voiceFor, speakNatural, recognizeNatural, piperBin, whisperBin };
