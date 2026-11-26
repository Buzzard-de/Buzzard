/**
 * Licensed Turkish voices that were downloaded and can be spoken locally.
 * None of these files is a council member's personal voice.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");
const { withHeavyProcess } = require("../buzzardNative/thinking/localProcessLock");

const CANORA = Object.freeze({
  id: "canora-turkish",
  file: "model_quantized.onnx",
  license: "Apache-2.0",
  source: "https://huggingface.co/empiriolabsai/canora-turkish",
  runner: "onnxruntime",
  synthetic: true,
  designedVoice: true,
  personal: false,
  productVoice: false,
  commercialUse: true,
  lang: "tr",
});

const VOICES = Object.freeze([
  { id: "elif", speaker: "elif", description: "designed adult female" },
  { id: "emre", speaker: "emre", description: "designed adult male" },
]);

const GATED = Object.freeze([{
  id: "cem",
  license: "MIT",
  source: "https://huggingface.co/dcx514ai/piper_tts_turkish_high",
  status: "BLOCKED_EXTERNAL",
  reason: "GATED_REPO",
  present: false,
  personal: false,
  assignedAgent: null,
  productVoice: false,
}]);

function canoraDir() {
  return path.join(process.cwd(), "data", "models", "speech", "canora");
}

function voiceReady(speaker) {
  const dir = canoraDir();
  return fs.existsSync(path.join(dir, CANORA.file))
    && fs.existsSync(path.join(dir, "config.json"))
    && fs.existsSync(path.join(dir, "g2p_tr.py"))
    && fs.existsSync(path.join(dir, "voices", `${speaker}.bin`));
}

function turkishCatalog() {
  const installed = VOICES.map((voice) => {
    const present = voiceReady(voice.speaker);
    return {
      ...CANORA,
      ...voice,
      present,
      assignedAgent: null,
      personalAsset: "BLOCKED_ASSET",
      status: present ? "PARTIAL" : "BLOCKED_ASSET",
    };
  });
  return { voices: installed, gated: GATED, productVoice: "tr_TR-antalia-medium.onnx" };
}

function speakCatalog({ speaker = "elif", text = "" } = {}) {
  if (!VOICES.some((voice) => voice.speaker === speaker)) {
    return { ok: false, code: "UNKNOWN_CATALOG_VOICE", personal: false, audio: false };
  }
  if (!voiceReady(speaker)) {
    return { ok: false, code: "BLOCKED_ASSET", speaker, personal: false, audio: false, assignedAgent: null };
  }
  const script = path.join(__dirname, "canoraSpeak.py");
  const pythonPath = path.join(process.cwd(), "tools", "piper-py");
  const out = path.join(os.tmpdir(), `buzzard-canora-${crypto.randomBytes(4).toString("hex")}.wav`);
  const ran = withHeavyProcess(() => spawnSync("python3", [script, canoraDir(), speaker, String(text || ""), out], {
    encoding: "utf8",
    timeout: 30000,
    env: { ...process.env, PYTHONPATH: pythonPath, LD_LIBRARY_PATH: "" },
  }));
  if (ran.reason === "PROCESS_LOCK_TIMEOUT" || ran.status !== 0 || !fs.existsSync(out)) {
    return { ok: false, code: ran.reason === "PROCESS_LOCK_TIMEOUT" ? "PROCESS_LOCK_TIMEOUT" : "TTS_FAILED", audio: false, personal: false, paid: false };
  }
  const wav = fs.readFileSync(out);
  fs.unlinkSync(out);
  return {
    ok: wav.length > 44,
    code: "CATALOG_TTS",
    audio: true,
    wav,
    bytes: wav.length,
    sha256: crypto.createHash("sha256").update(wav).digest("hex"),
    speaker,
    model: CANORA.file,
    license: CANORA.license,
    source: CANORA.source,
    lang: "tr",
    synthetic: true,
    designedVoice: true,
    personal: false,
    ownVoice: false,
    productVoice: false,
    assignedAgent: null,
    personalAsset: "BLOCKED_ASSET",
    paid: false,
    hostedProvider: null,
  };
}

module.exports = { turkishCatalog, speakCatalog, CANORA };
