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

function modelCard(file) {
  const card = path.join(speechDir(), `${file}.json`);
  if (!fs.existsSync(card)) return { lang: null, license: "NOT_IN_MODEL_CARD", dataset: null };
  try {
    const data = JSON.parse(fs.readFileSync(card, "utf8"));
    return {
      lang: data.espeak?.voice || data.language?.code || null,
      license: data.license || "NOT_IN_MODEL_CARD",
      dataset: data.dataset || null,
    };
  } catch {
    return { lang: null, license: "NOT_IN_MODEL_CARD", dataset: null };
  }
}

const HEARD_TERMS = Object.freeze([
  "buzzard", "pusat", "sinan", "esat", "dogu", "doğu", "nedim", "tuncay",
  "amelia", "adrian", "mira", "leon", "banu", "zeynep", "bremsscheibe", "ankara", "berlin", "fiyat",
]);

function languageFits(modelLang, lang) {
  if (!modelLang || !lang) return false;
  return modelLang === lang || modelLang.startsWith(`${lang}-`) || modelLang.startsWith(`${lang}_`);
}

function voiceFor(agentId, lang = "tr") {
  if (!canUse(agentId, "speech")) {
    return { ok: false, code: "SPEECH_DENIED", agentId, speech: false };
  }
  const profile = PROFILES[agentId];
  if (!profile) return { ok: false, code: "VOICE_PROFILE_MISSING", agentId, speech: true };
  const registry = getAgent(agentId)?.voice_profile || null;
  const officialFile = registry?.officialSinan ? registry.file : null;
  const card = modelCard(profile.file);
  return {
    ok: true,
    agentId,
    voiceId: `${agentId}_${profile.speaker}`,
    registryVoiceId: registry?.voice_profile_id || null,
    lang,
    modelLang: card.lang,
    languageMatch: languageFits(card.lang, lang),
    modelFile: profile.file,
    speaker: profile.speaker,
    dataset: profile.dataset,
    license: card.license,
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

function speakNatural({ text, lang = "tr", agentId = "pusat", languageVoice = false, modelFile = null } = {}) {
  const language = VOICES[lang] || VOICES.tr;
  const languageCard = modelCard(language.file);
  const identity = languageVoice
    ? {
      ok: true,
      agentId,
      voiceId: `lang_${language.speaker}`,
      modelFile: language.file,
      modelLang: languageCard.lang,
      languageMatch: languageFits(languageCard.lang, lang),
      lengthScale: 1,
      noiseScale: 0.667,
      speech: true,
      officialVoiceUsed: false,
      scaleOnly: false,
    }
    : voiceFor(agentId, lang);
  if (!identity.ok) return { ...identity, naturalSpeech: false, audio: false };
  const bin = piperBin();
  const model = path.join(speechDir(), modelFile || identity.modelFile);
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
    modelFile: path.basename(model),
    modelLang: identity.modelLang || null,
    languageMatch: identity.languageMatch === true,
    speaker: identity.speaker || null,
    scaleOnly: false,
    officialVoiceUsed: false,
    referenceMixedIntoTts: false,
    agentId,
    lang,
    paid: false,
    hostedProvider: null,
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
  const ran = spawnSync(bin, [
    "-m", model,
    "-f", file,
    "-l", lang,
    "-nt",
    "--no-timestamps",
    "--prompt", "Buzzard Pusat fiyat Bremsscheibe Ankara Berlin",
  ], {
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
    return { ok: false, code: "STT_FAILED", transcript: null, raw: transcript || null, replaced: false, uncertain: true, generalSpeech: false, paid: false };
  }
  const heard = transcript.toLowerCase();
  const heardTerms = HEARD_TERMS.filter((term) => heard.includes(term));
  const samples = Math.max(0, Math.floor((wav.length - 44) / 2));
  const short = samples < 22050 * 0.4;
  return {
    ok: true,
    code: "NATURAL_STT",
    transcript,
    raw: transcript,
    replaced: false,
    uncertain: short && heardTerms.length === 0,
    heardTerms,
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
