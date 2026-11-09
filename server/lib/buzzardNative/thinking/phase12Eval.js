const { infer, DEFAULT_RULES } = require("./inferenceEngine");
const { solve } = require("./solve");
const { createErrorLearner } = require("./errorLearning");
const { runPhase10ThinkingEval } = require("./phase10Eval");
const { transformerDispatch } = require("./transformerDispatch");

function heldOut() {
  return [
    {
      id: "H12_chain",
      run: () =>
        infer({
          facts: { rain: true, destination: "openai" },
          rules: DEFAULT_RULES,
        }).facts.allowed === false && infer({ facts: { rain: true }, rules: DEFAULT_RULES }).facts.slip_risk === "elevated",
    },
    {
      id: "H12_missing_then_unknown",
      run: () => solve({ problem: "unknown market size", facts: {} }).steps[3].unknown.length > 0,
    },
    {
      id: "H12_learn_fail",
      run: () => {
        const L = createErrorLearner();
        L.record({ problem: "egress", action: "call_openai", outcome: "fail" });
        const p = L.propose({ problem: "egress", actions: ["call_openai", "deny"] });
        return p.chosen === "deny" && p.learnedNeural === false;
      },
    },
    {
      id: "H12_not_llm",
      run: () => transformerDispatch().code === "NOT_IMPLEMENTED",
    },
  ];
}

function runPhase12Eval() {
  const p10 = runPhase10ThinkingEval();
  const rows = heldOut().map((c) => {
    let pass = false;
    let error = null;
    try {
      pass = c.run() === true;
      if (!pass) error = "held_out_failed";
    } catch (err) {
      error = String(err.message || err);
    }
    return { id: c.id, pass, error, match: "structured" };
  });
  const passed = rows.filter((r) => r.pass).length;
  return {
    kind: "RULE_BASED",
    llmCompleted: false,
    generalIntelligence: false,
    phase10: { passed: p10.passed, total: p10.total },
    heldOut: { passed, total: rows.length, rows },
    improvedVsPhase10: "new_held_out_and_error_memory_not_neural_iq",
    productionTransformer: transformerDispatch(),
  };
}

module.exports = { runPhase12Eval };
