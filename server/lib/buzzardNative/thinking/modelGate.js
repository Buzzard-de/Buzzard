/**
 * Buzzard inference gate. A missing local checkpoint is not a successful model call.
 */
const { createInferenceRuntime } = require("./inferenceRuntime");

function modelGate() {
  const runtime = createInferenceRuntime();
  if (!runtime.loaded) {
    return {
      ok: false,
      code: "MODEL_NOT_CONFIGURED",
      llmCompleted: false,
      hostedProvider: null,
      ruleEngine: "ACTIVE",
      mayStartAction: false,
    };
  }
  return { ok: true, code: "LOCAL_CHECKPOINT", llmCompleted: false, hostedProvider: null, mayStartAction: false };
}

module.exports = { modelGate };
