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

const TURKISH = Object.freeze({
  file: "tr_TR-antalia-medium.onnx",
  speaker: "antalia",
  lang: "tr",
  license: "CC-BY-4.0",
  source: "https://huggingface.co/ozgurguler/piper-tr-antalia-medium",
  dataset: "https://huggingface.co/datasets/cloud0day3/antalia-voice-corpus",
  attribution: "Antalia Turkish single-speaker corpus, CC BY 4.0. Synthetic voice. Not a council member and not Sinan Bey's recording.",
  commercialUse: true,
  synthetic: true,
  productVoice: true,
  runner: "piper-tts-1.8.0",
  runnerLicense: "GPL-3.0",
});

const NONCOMMERCIAL = Object.freeze({
  "tr_TR-dfki-medium.onnx": {
    license: "CC-BY-NC-SA-4.0",
    source: "https://github.com/marytts/dfki-ot-data/",
    commercialUse: false,
    productVoice: false,
    synthetic: true,
    turkish: true,
  },
});

const VOICES = Object.freeze({
  tr: { file: TURKISH.file, lang: "tr", speaker: TURKISH.speaker, license: TURKISH.license, source: TURKISH.source },
  de: { file: "de_DE-kerstin-low.onnx", lang: "de", speaker: "kerstin", license: LICENSE, source: SOURCE },
  en: { file: "en_US-lessac-medium.onnx", lang: "en", speaker: "lessac", license: LICENSE, source: SOURCE },
});

const PROFILES = Object.freeze({
  pusat: { file: null, speaker: null, dataset: null, personal: false },
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

function voiceRecord(file) {
  if (file === TURKISH.file) return TURKISH;
  return NONCOMMERCIAL[file] || {
    license: "NOT_IN_MODEL_CARD",
    source: SOURCE,
    commercialUse: false,
    productVoice: false,
    synthetic: true,
  };
}

function modelCard(file) {
  const known = voiceRecord(file);
  const card = path.join(speechDir(), `${file}.json`);
  if (!fs.existsSync(card)) return { lang: null, license: known.license, dataset: known.dataset || null, phonemePairs: false };
  try {
    const data = JSON.parse(fs.readFileSync(card, "utf8"));
    const phonemePairs = Object.keys(data.phoneme_id_map || {}).some((key) => [...key].length > 1);
    return {
      lang: data.espeak?.voice || data.language?.code || null,
      license: data.license || known.license,
      dataset: data.dataset || known.dataset || null,
      phonemePairs,
    };
  } catch {
    return { lang: null, license: known.license, dataset: known.dataset || null, phonemePairs: false };
  }
}

function prepareTurkish(text) {
  const original = String(text || "");
  let next = original;
  const pairs = [
    [/Turkiye/g, "Türkiye"],
    [/turkiye/g, "türkiye"],
    [/Baskent/g, "Başkent"],
    [/baskent/g, "başkent"],
    [/kaydini/g, "kaydını"],
    [/soyler/g, "söyler"],
  ];
  for (const [pattern, value] of pairs) next = next.replace(pattern, value);
  return { text: next, original, normalized: next !== original };
}

function piperPython() {
  const dir = path.join(process.cwd(), "tools", "piper-py");
  return fs.existsSync(path.join(dir, "piper")) ? dir : null;
}

const HEARD_TERMS = Object.freeze([
  "buzzard", "pusat", "sinan", "esat", "dogu", "doğu", "nedim", "tuncay",
  "amelia", "adrian", "mira", "leon", "banu", "zeynep", "bremsscheibe", "ankara", "berlin", "fiyat",
]);

function languageFits(modelLang, lang) {
  if (!modelLang || !lang) return false;
  return modelLang === lang || modelLang.startsWith(`${lang}-`) || modelLang.startsWith(`${lang}_`);
}

function personalVoicePath(agentId) {
  return path.join(speechDir(), "members", `${agentId}.onnx`);
}

function personalVoiceStatus(agentId) {
  return fs.existsSync(personalVoicePath(agentId)) ? "PARTIAL" : "BLOCKED_ASSET";
}

function voiceFor(agentId, lang = "tr") {
  if (!canUse(agentId, "speech")) {
    return { ok: false, code: "SPEECH_DENIED", agentId, speech: false };
  }
  const profile = PROFILES[agentId];
  if (!profile) return { ok: false, code: "VOICE_PROFILE_MISSING", agentId, speech: true };
  const registry = getAgent(agentId)?.voice_profile || null;
  const officialFile = registry?.officialSinan ? registry.file : null;
  const personalAsset = personalVoiceStatus(agentId);
  if (!profile.file) {
    return {
      ok: true,
      agentId,
      voiceId: `${agentId}_personal_missing`,
      registryVoiceId: registry?.voice_profile_id || null,
      lang,
      modelLang: null,
      languageMatch: false,
      turkishNatural: false,
      commercialUse: false,
      synthetic: false,
      productVoice: false,
      personalAsset,
      personalFile: path.relative(process.cwd(), personalVoicePath(agentId)),
      modelFile: null,
      speaker: null,
      dataset: null,
      license: null,
      source: null,
      attribution: null,
      lengthScale: 1,
      noiseScale: 0.667,
      scaleOnly: false,
      speech: true,
      cloneAuthorized: false,
      officialReference: officialFile,
      officialVoiceUsed: false,
      referenceMixedIntoTts: false,
      probe: "personal model file missing",
    };
  }
  const card = modelCard(profile.file);
  const known = voiceRecord(profile.file);
  return {
    ok: true,
    agentId,
    voiceId: `${agentId}_${profile.speaker}`,
    registryVoiceId: registry?.voice_profile_id || null,
    lang,
    modelLang: card.lang,
    languageMatch: languageFits(card.lang, lang),
    turkishNatural: false,
    personalAsset,
    personalFile: path.relative(process.cwd(), personalVoicePath(agentId)),
    commercialUse: known.commercialUse === true,
    synthetic: true,
    productVoice: known.productVoice === true,
    modelFile: profile.file,
    speaker: profile.speaker,
    dataset: profile.dataset,
    license: known.license || card.license,
    source: known.source || SOURCE,
    attribution: known.attribution || null,
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

function speakNatural({ text, lang = "tr", agentId = "pusat", languageVoice = false, modelFile = null, turkish = false } = {}) {
  const language = VOICES[lang] || VOICES.tr;
  const languageCard = modelCard(language.file);
  const languageKnown = voiceRecord(language.file);
  const identity = languageVoice
    ? {
      ok: true,
      agentId,
      voiceId: `lang_${language.speaker}`,
      modelFile: language.file,
      modelLang: languageCard.lang,
      languageMatch: languageFits(languageCard.lang, lang),
      turkishNatural: lang === "tr" && languageKnown.productVoice === true,
      commercialUse: languageKnown.commercialUse === true,
      synthetic: true,
      license: languageKnown.license,
      attribution: languageKnown.attribution || null,
      lengthScale: 1,
      noiseScale: 0.667,
      speech: true,
      officialVoiceUsed: false,
      scaleOnly: false,
    }
    : voiceFor(agentId, lang);
  if (!identity.ok) return { ...identity, naturalSpeech: false, audio: false };
  if (!identity.modelFile && !modelFile && !(turkish && lang === "tr")) {
    return {
      ok: false,
      code: "BLOCKED_ASSET",
      personalAsset: identity.personalAsset || "BLOCKED_ASSET",
      turkishNatural: false,
      productVoice: false,
      naturalSpeech: false,
      audio: false,
      paid: false,
      agentId,
    };
  }
  const profileFile = identity.modelFile;
  let spoken = identity;
  let ownVoice = true;
  let sharedVoice = false;
  if (turkish && lang === "tr" && identity.turkishNatural !== true && !modelFile) {
    if (!fs.existsSync(path.join(speechDir(), TURKISH.file))) {
      return {
        ok: false,
        code: "TURKISH_VOICE_MISSING",
        assetStatus: "BLOCKED_ASSET",
        turkishNatural: false,
        naturalSpeech: false,
        audio: false,
        paid: false,
        profileModel: profileFile,
      };
    }
    const turkishCard = modelCard(TURKISH.file);
    spoken = {
      ...identity,
      modelFile: TURKISH.file,
      modelLang: turkishCard.lang || "tr",
      languageMatch: true,
      turkishNatural: true,
      commercialUse: true,
      synthetic: true,
      license: TURKISH.license,
      attribution: TURKISH.attribution,
      speaker: TURKISH.speaker,
    };
    ownVoice = false;
    sharedVoice = true;
  }
  const bin = piperBin();
  const model = path.join(speechDir(), modelFile || spoken.modelFile);
  const python = modelCard(path.basename(model)).phonemePairs === true;
  if (!fs.existsSync(model) || (!python && !bin) || (python && !piperPython())) {
    return {
      ok: false,
      code: !fs.existsSync(model) ? "NATURAL_SPEECH_NOT_CONFIGURED" : "PIPER_RUNTIME_MISSING",
      naturalSpeech: false,
      audio: false,
      paid: false,
      turkishNatural: false,
    };
  }
  const prepared = lang === "tr" ? prepareTurkish(text) : { text: String(text || ""), original: String(text || ""), normalized: false };
  const out = path.join(os.tmpdir(), `buzzard-${crypto.randomBytes(4).toString("hex")}.wav`);
  const ran = python
    ? spawnSync("python3", [
      "-m", "piper",
      "-m", model,
      "-f", out,
      "--length-scale", String(spoken.lengthScale),
      "--noise-scale", String(spoken.noiseScale),
      "--",
      prepared.text,
    ], {
      encoding: "utf8",
      timeout: 20000,
      env: { ...process.env, PYTHONPATH: piperPython() },
    })
    : spawnSync(bin, [
      "--model", model,
      "--output_file", out,
      "--length_scale", String(spoken.lengthScale),
      "--noise_scale", String(spoken.noiseScale),
    ], {
      input: `${prepared.text}\n`,
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
    profileModel: profileFile,
    modelLang: spoken.modelLang || null,
    languageMatch: spoken.languageMatch === true,
    turkishNatural: spoken.turkishNatural === true,
    commercialUse: spoken.commercialUse === true,
    synthetic: spoken.synthetic === true,
    ownVoice: ownVoice,
    personalAsset: identity.personalAsset || personalVoiceStatus(agentId),
    sharedVoice,
    attribution: spoken.attribution || null,
    license: spoken.license || voiceRecord(path.basename(model)).license,
    textNormalized: prepared.normalized,
    spokenText: prepared.text,
    runner: python ? TURKISH.runner : "piper-cpp",
    speaker: spoken.speaker || null,
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

function councilAssets() {
  const { ids, getAgent } = require("../buzzardNative/core/identityRegistry");
  return ids().map((agentId) => {
    const agent = getAgent(agentId);
    const voiceFile = personalVoicePath(agentId);
    const avatarDir = path.join(process.cwd(), "data", "models", "avatars");
    const gltf = path.join(avatarDir, `${agentId}.gltf`);
    const glb = path.join(avatarDir, `${agentId}.glb`);
    const avatarPresent = fs.existsSync(gltf) || fs.existsSync(glb);
    return {
      agentId,
      role: agent?.role || null,
      speech: canUse(agentId, "speech"),
      voiceSeedStatus: agent?.voice_profile?.status || null,
      personalVoice: fs.existsSync(voiceFile) ? "PARTIAL" : "BLOCKED_ASSET",
      personalVoiceFile: path.relative(process.cwd(), voiceFile),
      productTurkish: TURKISH.file,
      productLicense: TURKISH.license,
      productIsPersonal: false,
      turkishPersonal: false,
      avatarSeedStatus: agent?.avatar_profile?.status || null,
      avatarAsset: avatarPresent ? "PARTIAL" : "BLOCKED_ASSET",
      avatarFile: avatarPresent ? path.relative(process.cwd(), fs.existsSync(glb) ? glb : gltf) : null,
      is3d: false,
      photoreal: false,
      scannedBody: false,
      officialReference: agent?.voice_profile?.officialSinan ? agent.voice_profile.file : null,
      cloneAuthorized: false,
      referenceMixedIntoTts: false,
    };
  });
}

module.exports = {
  VOICES,
  PROFILES,
  TURKISH,
  voiceRecord,
  voiceFor,
  councilAssets,
  speakNatural,
  recognizeNatural,
  piperBin,
  whisperBin,
};
