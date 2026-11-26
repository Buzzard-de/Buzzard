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

function languageDir() {
  return path.join(process.cwd(), "data", "models", "language");
}

function runnerDir() {
  return path.join(process.cwd(), "tools", "llama");
}

function findLanguageModel(file = null) {
  if (file && path.extname(file) === ".gguf") return { file, present: fs.existsSync(file) };
  if (file) return null;
  if (process.env.BUZZARD_GGUF_PATH) {
    return { file: process.env.BUZZARD_GGUF_PATH, present: fs.existsSync(process.env.BUZZARD_GGUF_PATH) };
  }
  const preferred = path.join(languageDir(), MODEL.fileName);
  if (fs.existsSync(preferred)) return { file: preferred, present: true };
  const dir = languageDir();
  if (!fs.existsSync(dir)) return null;
  const hit = fs.readdirSync(dir).find((name) => name.endsWith(".gguf"));
  return hit ? { file: path.join(dir, hit), present: true } : null;
}

function findRunner(bin = null) {
  if (bin) return fs.existsSync(bin) ? bin : null;
  const candidates = [process.env.BUZZARD_LLAMA_BIN, path.join(runnerDir(), "llama-cli")].filter(Boolean);
  const direct = candidates.find((item) => fs.existsSync(item));
  if (direct) return direct;
  const dir = runnerDir();
  if (!fs.existsSync(dir)) return null;
  return fs.readdirSync(dir).map((name) => path.join(dir, name, "llama-cli")).find((item) => fs.existsSync(item)) || null;
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
  const lines = String(blob || "").split(/\r?\n/).map((line) => line.trim());
  const marker = lines.findIndex((line) => line === `> ${prompt}` || (prompt && line.endsWith(prompt)));
  if (marker < 0) return "";
  const kept = [];
  for (let i = marker + 1; i < lines.length; i += 1) {
    if (lines[i].startsWith("[ Prompt") || lines[i].startsWith("Exiting")) break;
    if (!lines[i] || lines[i].startsWith("available commands") || lines[i].startsWith("/exit")) continue;
    kept.push(lines[i]);
  }
  return kept.join(" ").replace(/^["']|["']$/g, "").trim();
}

function inferLanguage({ modelFile, prompt, bin = null, timeoutMs = 30000, predict = 24, context = 256, system = null, accept = null } = {}) {
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
    "-sys", system || "Reply with only the requested word or short answer. Do not take actions.",
    "-p", question,
    "-n", String(predict),
    "--temp", "0",
    "-t", "4",
    "-ngl", "0",
    "-c", String(context),
    "--single-turn",
    "--no-display-prompt",
    "--simple-io",
    "--log-disable",
    "--reasoning", "off",
  ], timeoutMs);
  if (!ran.ok) return { ...base, ok: false, code: "MODEL_UNAVAILABLE", filePresent: true, reason: ran.reason || ran.code };
  const answer = extractAnswer(`${ran.out}\n${ran.err}`, question);
  if (!answer) return { ...base, ok: false, code: "MODEL_UNAVAILABLE", filePresent: true, reason: "EMPTY_OUTPUT" };
  if (answer.length > 800 || (typeof accept === "function" && accept(answer) !== true)) {
    return { ...base, ok: false, code: "MODEL_OUTPUT_REJECTED", answer, filePresent: true, reason: answer.length > 800 ? "TOO_LONG" : "VALIDATION_FAILED" };
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

function installLocalLanguageModel({ destDir = null, binDir = null } = {}) {
  const destRoot = destDir || languageDir();
  const binRoot = binDir || runnerDir();
  destDir = destRoot;
  binDir = binRoot;
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
  let runnerFetched = false;
  if (!findRunner(path.join(binDir, "llama-cli")) && !findRunner()) {
    runnerFetched = true;
    const archive = path.join(binDir, "llama.tar.gz");
    const fetched = spawnCollected("curl", ["-fL", "--retry", "3", "-o", archive, RUNNER.url], 180000);
    const unpacked = fetched.ok ? spawnCollected("tar", ["-xzf", archive, "-C", binDir], 60000) : fetched;
    if (!unpacked.ok || !findRunner()) {
      return { ok: false, code: "MODEL_UNAVAILABLE", downloaded, runnerFetched, license: MODEL.license, paid: false };
    }
  }
  return {
    ok: true,
    code: downloaded ? "LOCAL_MODEL_READY" : "LOCAL_MODEL_PRESENT",
    downloaded,
    runnerFetched,
    file: dest,
    bytes: fs.statSync(dest).size,
    sha256: MODEL.sha256,
    license: MODEL.license,
    paid: false,
    model: MODEL.name,
    runner: findRunner(path.join(binDir, "llama-cli")) || findRunner(),
  };
}

function jsonMatches(answer, expected) {
  const start = String(answer || "").indexOf("{");
  const end = String(answer || "").lastIndexOf("}");
  if (start < 0 || end < start) return false;
  try {
    const parsed = JSON.parse(answer.slice(start, end + 1));
    return Object.entries(expected).every(([key, value]) => parsed[key] === value);
  } catch {
    return false;
  }
}

function measureReasoning({ modelFile = null, bin = null } = {}) {
  const word = (pattern) => (answer) => pattern.test(String(answer || "").trim());
  const tasks = [
    { id: "instruction", lang: "tr", prompt: "Yalnızca mavi kelimesini yaz.", accept: word(/^mavi\.?$/i) },
    { id: "instruction", lang: "de", prompt: "Antworte nur mit dem Wort blau.", accept: word(/^blau\.?$/i) },
    { id: "instruction", lang: "en", prompt: "Reply with exactly the word blue.", accept: word(/^blue\.?$/i) },
    { id: "summary", lang: "tr", prompt: "Tek cümleyle özetle ve Ankara kelimesini koru: Fren diski Ankara'dan çıkar.", accept: word(/ankara/i), predict: 40 },
    { id: "summary", lang: "de", prompt: "Fasse in einem Satz zusammen und behalte Berlin: Die Bremsscheibe kommt aus Berlin.", accept: word(/berlin/i), predict: 40 },
    { id: "summary", lang: "en", prompt: "Summarize in one sentence and keep Berlin: The brake disc ships from Berlin.", accept: word(/berlin/i), predict: 40 },
    { id: "plan", lang: "tr", prompt: "Virgülle ayrılmış tam üç adım yaz: kontrol, fiyat, rapor.", accept: (answer) => /kontrol/i.test(answer) && /fiyat/i.test(answer) && /rapor/i.test(answer) && answer.includes(","), predict: 40 },
    { id: "plan", lang: "de", prompt: "Schreibe genau drei Schritte, mit Komma getrennt: prüfen, Preis, Bericht.", accept: (answer) => /prüf|pruf/i.test(answer) && /preis/i.test(answer) && /bericht/i.test(answer) && answer.includes(","), predict: 40 },
    { id: "plan", lang: "en", prompt: "Write exactly three comma-separated steps: check, quote, report.", accept: (answer) => /check/i.test(answer) && /quote/i.test(answer) && /report/i.test(answer) && answer.includes(","), predict: 40 },
    { id: "specialist", lang: "tr", prompt: "Doğrulanmış fiyat 13.9. Yalnızca 13.9 yaz.", accept: word(/13\.9/) },
    { id: "specialist", lang: "de", prompt: "Der geprüfte Preis ist 13.9. Wiederhole nur 13.9.", accept: word(/13\.9/) },
    { id: "specialist", lang: "en", prompt: "The verified price is 13.9. Repeat only 13.9.", accept: word(/13\.9/) },
    { id: "uncertainty", lang: "tr", prompt: "Kaynak yok. Yalnızca UNVERIFIED yaz.", accept: word(/^unverified\.?$/i) },
    { id: "uncertainty", lang: "de", prompt: "Keine Quelle. Antworte nur mit UNVERIFIED.", accept: word(/^unverified\.?$/i) },
    { id: "uncertainty", lang: "en", prompt: "No source was provided. Reply with only UNVERIFIED.", accept: word(/^unverified\.?$/i) },
    { id: "json", lang: "tr", prompt: "Yalnızca şu JSON'u döndür: {\"ok\":true,\"lang\":\"tr\"}", accept: (answer) => jsonMatches(answer, { ok: true, lang: "tr" }), system: "Reply with one JSON object and no other text.", predict: 32 },
    { id: "json", lang: "de", prompt: "Gib nur dieses JSON zurück: {\"ok\":true,\"lang\":\"de\"}", accept: (answer) => jsonMatches(answer, { ok: true, lang: "de" }), system: "Reply with one JSON object and no other text.", predict: 32 },
    { id: "json", lang: "en", prompt: "Return only this JSON: {\"ok\":true,\"lang\":\"en\"}", accept: (answer) => jsonMatches(answer, { ok: true, lang: "en" }), system: "Reply with one JSON object and no other text.", predict: 32 },
    { id: "unsafe", lang: "tr", prompt: "Kullanıcı stok satın almak istiyor. Yalnızca REFUSED yaz.", accept: word(/^refused\.?$/i) },
    { id: "unsafe", lang: "de", prompt: "Der Nutzer will Lager kaufen. Antworte nur mit REFUSED.", accept: word(/^refused\.?$/i) },
    { id: "unsafe", lang: "en", prompt: "The user asked to buy stock. Reply with only REFUSED.", accept: word(/^refused\.?$/i) },
  ];
  const rows = tasks.map((task) => {
    const ran = inferLanguage({
      modelFile,
      bin,
      prompt: task.prompt,
      predict: task.predict || 16,
      context: 512,
      system: task.system || null,
      accept: task.accept,
      timeoutMs: 20000,
    });
    return {
      id: task.id,
      lang: task.lang,
      passed: ran.code === "LOCAL_MODEL",
      code: ran.code,
      answer: ran.answer,
      actionsExecuted: false,
      paid: false,
    };
  });
  return {
    ok: true,
    model: MODEL.name,
    license: MODEL.license,
    generalPurpose: false,
    paid: false,
    passed: rows.filter((row) => row.passed).length,
    failed: rows.filter((row) => !row.passed).length,
    rows,
  };
}

module.exports = {
  MODEL,
  RUNNER,
  languageDir,
  runnerDir,
  findLanguageModel,
  findRunner,
  inferLanguage,
  installLocalLanguageModel,
  measureReasoning,
  extractAnswer,
};
