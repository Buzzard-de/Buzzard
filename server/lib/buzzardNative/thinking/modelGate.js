/**
 * Buzzard inference gate. A missing local checkpoint is not a successful model call.
 * A valid checkpoint is loaded only from an explicit file. It cannot start an action.
 */
const fs = require("fs");
const path = require("path");
const { createInferenceRuntime } = require("./inferenceRuntime");
const { createTransformer, checkpoint, verifyCheckpoint } = require("./transformer");
const { findLanguageModel, inferLanguage } = require("./localLanguageModel");

function candidateFile(file) {
  if (file) return file;
  if (process.env.BUZZARD_MODEL_PATH) return process.env.BUZZARD_MODEL_PATH;
  return path.join(process.cwd(), "data", "models", "buzzard-local-checkpoint.json");
}

function modelGate({ file = null } = {}) {
  if (file && path.extname(file) === ".gguf") {
    const present = fs.existsSync(file);
    return {
      llmCompleted: false,
      hostedProvider: null,
      ruleEngine: "ACTIVE",
      mayStartAction: false,
      generalPurpose: false,
      file,
      filePresent: present,
      ok: false,
      code: present ? "LOCAL_MODEL_FILE" : "MODEL_NOT_CONFIGURED",
      generalReasoning: "UNAVAILABLE",
    };
  }
  const target = candidateFile(file);
  const base = {
    llmCompleted: false,
    hostedProvider: null,
    ruleEngine: "ACTIVE",
    mayStartAction: false,
    generalPurpose: false,
    file: target,
  };
  if (!fs.existsSync(target)) return { ...base, ok: false, code: "MODEL_NOT_CONFIGURED", filePresent: false };
  let data = null;
  try {
    data = JSON.parse(fs.readFileSync(target, "utf8"));
  } catch {
    return { ...base, ok: false, code: "CHECKPOINT_CORRUPT", filePresent: true };
  }
  const runtime = createInferenceRuntime();
  const loaded = runtime.load({ checkpoint: data, tokenizer: { tokens: [] }, actorId: "pusat" });
  if (!loaded.ok) return { ...base, ok: false, code: loaded.code || "CHECKPOINT_CORRUPT", filePresent: true, integrity: verifyCheckpoint(data) };
  return {
    ...base,
    ok: true,
    code: "LOCAL_CHECKPOINT",
    status: loaded.status,
    liveVerified: false,
    loaded: runtime.loaded,
    filePresent: true,
    generalReasoning: "UNAVAILABLE",
  };
}

function modelHealth({ file = null } = {}) {
  const gate = modelGate({ file });
  const health = {
    filePresent: gate.filePresent === true,
    configured: gate.ok === true,
    code: gate.code,
    generalReasoning: "UNAVAILABLE",
    generalPurpose: false,
    ruleEngine: "ACTIVE",
    mayStartAction: false,
    hostedProvider: null,
    liveVerified: false,
    probe: null,
  };
  if (!gate.ok) return health;
  const runtime = createInferenceRuntime();
  const raw = JSON.parse(fs.readFileSync(candidateFile(file), "utf8"));
  const loaded = runtime.load({ checkpoint: raw, tokenizer: { merges: [], vocabSize: raw.vocabSize }, actorId: "pusat" });
  if (!loaded.ok || raw.vocabSize < 256) {
    health.probe = { ok: false, code: loaded.ok ? "CHECKPOINT_TOO_SMALL" : loaded.code, generalPurpose: false };
    return health;
  }
  const probe = runtime.generate({ text: " ", steps: 1 });
  health.probe = {
    ok: probe.ok === true,
    code: probe.ok ? "FORWARD_PASS" : probe.code,
    tokens: probe.tokens || 0,
    generalPurpose: false,
  };
  return health;
}

function prepareLocalModel({ dest } = {}) {
  if (!dest || path.extname(dest) !== ".json" || path.basename(dest) === "buzzard.db") {
    return { ok: false, code: "MODEL_DEST_REQUIRED", filePresent: false };
  }
  const model = createTransformer({ vocabSize: 256, dModel: 8, nHeads: 2, nPos: 16, dff: 16, seed: 11 });
  const data = checkpoint(model);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify(data));
  const health = modelHealth({ file: dest });
  return {
    ok: health.probe?.ok === true,
    code: health.probe?.ok ? "LOCAL_CHECKPOINT_WRITTEN" : health.probe?.code || health.code,
    dest,
    filePresent: true,
    generalPurpose: false,
    generalReasoning: "UNAVAILABLE",
    hostedProvider: null,
    paid: false,
    health,
  };
}

function consultReasoning({ file = null, prompt = "", bin = null } = {}) {
  const language = findLanguageModel(file);
  if (language) {
    const inferred = inferLanguage({ modelFile: language.file, prompt, bin });
    return {
      ...inferred,
      basis: inferred.code === "LOCAL_MODEL" ? "LOCAL_MODEL" : inferred.code,
      health: { filePresent: inferred.filePresent === true, code: inferred.code, generalPurpose: false, mayStartAction: false },
    };
  }
  const health = modelHealth({ file });
  const base = { answer: null, llmCompleted: false, basis: "RULE_BASED", generalPurpose: false, mayStartAction: false, health };
  if (!health.filePresent) return { ...base, ok: false, code: "MODEL_NOT_CONFIGURED" };
  if (!health.configured) return { ...base, ok: false, code: health.code };
  return { ...base, ok: false, code: "GENERAL_REASONING_UNAVAILABLE" };
}

module.exports = { modelGate, modelHealth, prepareLocalModel, consultReasoning };
