const { createTransformerLab } = require("./transformerLab");
const { createInferenceRuntime } = require("./inferenceRuntime");
const { registry } = require("./datasetRegistry");
const { whyReasoningFails } = require("./whyReasoningFails");
const { transformerDispatch } = require("./transformerDispatch");
const { runReasoning, runReasoningPhase6 } = require("./reasoningEval");

function runPhase8Thinking({ actorId = "sinan_bey" } = {}) {
  const lab = createTransformerLab();
  const train = lab.trainRun({ epochs: 1, actorId });
  if (!train.ok) return train;
  const infer = createInferenceRuntime();
  const loaded = infer.load({ checkpoint: lab.last.ckpt, tokenizer: lab.last.tokenizer, actorId });
  const gen = infer.generate({ text: "Buzzard", steps: 4 });
  const corrupt = JSON.parse(JSON.stringify(lab.last.ckpt));
  corrupt.sha256 = "deadbeef";
  const bad = infer.load({ checkpoint: corrupt, tokenizer: lab.last.tokenizer, actorId: "stranger" });
  const badHash = createInferenceRuntime().load({
    checkpoint: corrupt,
    tokenizer: lab.last.tokenizer,
    actorId: "sinan_bey",
  });
  return {
    productionTransformer: transformerDispatch(),
    train,
    inference: { loaded, gen, status: gen.ok ? "TESTED" : "PARTIAL", liveVerified: false },
    corruptLoad: badHash,
    unauthorizedLoad: bad,
    data: registry(),
    why: whyReasoningFails(),
    reasoning: lab.last ? { p5: runReasoning(lab), p6: runReasoningPhase6(lab) } : null,
    developedVsPhase7: "inference_runtime_separated_from_training",
  };
}

module.exports = { runPhase8Thinking };
