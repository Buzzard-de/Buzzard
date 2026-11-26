/**
 * Local language-model loader for the existing model gate.
 * Weights stay outside git. The process never calls a hosted AI API.
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const MODEL = Object.freeze({
  name: "Qwen2.5-1.5B-Instruct",
  quant: "Q4_K_M",
  fileName: "qwen2.5-1.5b-instruct-q4_k_m.gguf",
  url: "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf",
  license: "Apache-2.0",
  sha256: "6a1a2eb6d15622bf3c96857206351ba97e1af16c30d7a74ee38970e434e9407e",
  bytes: 1117320736,
  languages: ["tr", "de", "en"],
  device: "cpu",
  gpuLayers: 0,
});

const RUNNER = Object.freeze({
  name: "llama.cpp",
  build: "b12755",
  license: "MIT",
  url: "https://github.com/ggml-org/llama.cpp/releases/download/b12755/llama-b12755-bin-ubuntu-x64.tar.gz",
});

function findLanguageModel(file = null) {
  if (file && path.extname(file) === ".gguf") return { file, present: fs.existsSync(file) };
  if (file) return null;
  if (process.env.BUZZARD_GGUF_PATH) {
    return { file: process.env.BUZZARD_GGUF_PATH, present: fs.existsSync(process.env.BUZZARD_GGUF_PATH) };
  }
  const dir = path.join(process.cwd(), "data", "models");
  if (!fs.existsSync(dir)) return null;
  const hit = fs.readdirSync(dir).find((name) => name.endsWith(".gguf"));
  return hit ? { file: path.join(dir, hit), present: true } : null;
}

function findRunner(bin = null) {
  if (bin) return fs.existsSync(bin) ? bin : null;
  const candidates = [process.env.BUZZARD_LLAMA_BIN, path.join(process.cwd(), "tools", "llama", "llama-cli")].filter(Boolean);
  return candidates.find((item) => fs.existsSync(item)) || null;
}

function spawnCollected(command, args, timeoutMs) {
  const ran = spawnSync(command, args, { timeout: timeoutMs, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (ran.error) {
    const reason = ran.error.code === "ETIMEDOUT" ? "TIMEOUT" : String(ran.error.message || ran.error);
    return { ok: false, code: "MODEL_UNAVAILABLE", reason, out: ran.stdout || "", err: ran.stderr || "" };
  }
  return {
    ok: ran.status === 0,
    code: ran.status === 0 ? "EXIT" : "MODEL_UNAVAILABLE",
    status: ran.status,
    out: ran.stdout || "",
    err: ran.stderr || "",
  };
}

function extractAnswer(blob, prompt) {
  const lines = String(blob || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const marker = lines.findIndex((line) => line === `> ${prompt}` || line.endsWith(prompt));
  if (marker < 0) return "";
  for (let i = marker + 1; i < lines.length; i += 1) {
    if (lines[i].startsWith("[ Prompt") || lines[i].startsWith("Exiting")) break;
    if (lines[i].startsWith("available commands") || lines[i].startsWith("/exit")) continue;
    return lines[i].replace(/^["']|["']$/g, "").trim();
  }
  return "";
}

function inferLanguage({ modelFile, prompt, bin = null, timeoutMs = 30000 } = {}) {
  const located = findLanguageModel(modelFile);
  const base = {
    answer: null,
    llmCompleted: false,
    hostedProvider: null,
    paid: false,
    mayStartAction: false,
    actionsExecuted: false,
    generalPurpose: false,
    device: "cpu",
    gpuLayers: 0,
    model: MODEL.name,
    license: MODEL.license,
  };
  if (!located || !located.present) return { ...base, ok: false, code: "MODEL_NOT_CONFIGURED", filePresent: false };
  const runner = findRunner(bin);
  if (!runner) return { ...base, ok: false, code: "MODEL_UNAVAILABLE", filePresent: true, reason: "RUNNER_MISSING" };
  const question = String(prompt || "").replace(/^(genel muhakeme|serbest yorum|open reasoning)\s*[:\-]?\s*/i, "").trim();
  if (!question) return { ...base, ok: false, code: "MODEL_UNAVAILABLE", filePresent: true, reason: "EMPTY_PROMPT" };
  const ran = spawnCollected(runner, [
    "-m", located.file,
    "-sys", "Reply with only the requested word or short answer. Do not take actions.",
    "-p", question,
    "-n", "24",
    "--temp", "0",
    "-t", "4",
    "-ngl", "0",
    "-c", "256",
    "--single-turn",
    "--no-display-prompt",
    "--simple-io",
    "--log-disable",
    "--reasoning", "off",
  ], timeoutMs);
  if (!ran.ok) return { ...base, ok: false, code: "MODEL_UNAVAILABLE", filePresent: true, reason: ran.reason || ran.code };
  const answer = extractAnswer(`${ran.out}\n${ran.err}`, question);
  if (!answer || answer.length > 240) {
    return { ...base, ok: false, code: "MODEL_UNAVAILABLE", filePresent: true, reason: answer ? "TOO_LONG" : "EMPTY_OUTPUT" };
  }
  return {
    ...base,
    ok: true,
    code: "LOCAL_MODEL",
    answer,
    filePresent: true,
    file: located.file,
    bytes: fs.statSync(located.file).size,
    runner: RUNNER.name,
  };
}

function sha256File(file) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(file));
  return hash.digest("hex");
}

function installLocalLanguageModel({ destDir, binDir } = {}) {
  if (!destDir || !binDir) return { ok: false, code: "MODEL_DEST_REQUIRED", downloaded: false, paid: false };
  fs.mkdirSync(destDir, { recursive: true });
  fs.mkdirSync(binDir, { recursive: true });
  const dest = path.join(destDir, MODEL.fileName);
  let downloaded = false;
  if (!fs.existsSync(dest) || sha256File(dest) !== MODEL.sha256) {
    downloaded = true;
    const fetched = spawnCollected("curl", ["-fL", "--retry", "3", "-o", dest, MODEL.url], 180000);
    if (!fetched.ok || !fs.existsSync(dest) || sha256File(dest) !== MODEL.sha256) {
      return { ok: false, code: "MODEL_UNAVAILABLE", downloaded, license: MODEL.license, url: MODEL.url, paid: false };
    }
  }
  return {
    ok: true,
    code: downloaded ? "LOCAL_MODEL_READY" : "LOCAL_MODEL_PRESENT",
    downloaded,
    file: dest,
    bytes: fs.statSync(dest).size,
    sha256: MODEL.sha256,
    license: MODEL.license,
    paid: false,
    model: MODEL.name,
    runner: fs.existsSync(path.join(binDir, "llama-cli")),
  };
}

module.exports = { MODEL, RUNNER, findLanguageModel, findRunner, inferLanguage, installLocalLanguageModel, extractAnswer };
