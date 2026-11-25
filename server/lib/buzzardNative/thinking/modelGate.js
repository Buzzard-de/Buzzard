/**
 * Buzzard inference gate. A missing local checkpoint is not a successful model call.
 * A valid checkpoint is loaded only from an explicit file. It cannot start an action.
 */
const fs = require("fs");
const path = require("path");
const { createInferenceRuntime } = require("./inferenceRuntime");
const { verifyCheckpoint } = require("./transformer");

function candidateFile(file) {
  if (file) return file;
  if (process.env.BUZZARD_MODEL_PATH) return process.env.BUZZARD_MODEL_PATH;
  return path.join(process.cwd(), "data", "models", "buzzard-local-checkpoint.json");
}

function modelGate({ file = null } = {}) {
  const target = candidateFile(file);
  const base = {
    llmCompleted: false,
    hostedProvider: null,
    ruleEngine: "ACTIVE",
    mayStartAction: false,
    generalPurpose: false,
    file: target,
  };
  if (!fs.existsSync(target)) return { ...base, ok: false, code: "MODEL_NOT_CONFIGURED" };
  let data = null;
  try {
    data = JSON.parse(fs.readFileSync(target, "utf8"));
  } catch {
    return { ...base, ok: false, code: "CHECKPOINT_CORRUPT" };
  }
  const runtime = createInferenceRuntime();
  const loaded = runtime.load({ checkpoint: data, tokenizer: { tokens: [] }, actorId: "pusat" });
  if (!loaded.ok) return { ...base, ok: false, code: loaded.code || "CHECKPOINT_CORRUPT", integrity: verifyCheckpoint(data) };
  return {
    ...base,
    ok: true,
    code: "LOCAL_CHECKPOINT",
    status: loaded.status,
    liveVerified: false,
    loaded: runtime.loaded,
  };
}

module.exports = { modelGate };
