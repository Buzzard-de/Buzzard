/**
 * Rule-based thinking prototype. Not a trained language model.
 */
const { createEngine, notImplemented } = require("../engineContract");
const { trainByteBpe, encode, roundtrip } = require("../thinking/tokenizer");
const { createLab, ARCHITECTURE_SPEC } = require("../thinking/lab");
const { createTransformerLab } = require("../thinking/transformerLab");
const { runReasoning, runReasoningPhase6 } = require("../thinking/reasoningEval");
const { transformerDispatch } = require("../thinking/transformerDispatch");
const { answer, evaluateAll } = require("../thinking/ruleReasoner");

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .split(/[^a-zA-Z0-9ğüşöçıİĞÜŞÖÇäöüß]+/u)
    .filter(Boolean);
}

function plan(goal) {
  const steps = String(goal || "")
    .split(/\s*(?:then|;|\n|\d+\.)\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
  return { steps: steps.length ? steps : [String(goal || "").trim()].filter(Boolean), learned: false };
}

function evaluate({ condition, facts = {} }) {
  if (!condition || typeof condition !== "object") return { ok: false, code: "BAD_CONDITION" };
  const failed = Object.entries(condition).filter(([k, v]) => facts[k] !== v);
  return { holds: failed.length === 0, failedKeys: failed.map(([k]) => k), learned: false };
}

function detectContradiction(statements = []) {
  const seen = new Map();
  const conflicts = [];
  for (const row of statements) {
    for (const [k, v] of Object.entries(row || {})) {
      if (seen.has(k) && seen.get(k) !== v) conflicts.push({ key: k, a: seen.get(k), b: v });
      else seen.set(k, v);
    }
  }
  return { contradiction: conflicts.length > 0, conflicts, learned: false };
}

function createThinkingEngine() {
  const lab = createLab();
  const xf = createTransformerLab();
  return createEngine({
    id: "thinking",
    capabilities: ["tokenize", "native_tokenize", "plan", "evaluate", "contradiction", "confidence", "toy_train", "transformer_proto", "rule_reason"],
    executeImpl(input) {
      const op = input.op || "plan";
      if (op === "tokenize") return { op, tokens: tokenize(input.text), model: "whitespace_rules", learned: false };
      if (op === "native_tokenize") {
        const model = input.bpe || trainByteBpe([String(input.text || "")], 8);
        const rt = roundtrip(input.text || "", model);
        return { op, ...rt, ids: encode(input.text || "", model), learnedVocab: true, neural: false };
      }
      if (op === "plan") return { op, ...plan(input.goal || input.text), learned: false };
      if (op === "evaluate") return { op, ...evaluate(input) };
      if (op === "contradiction") return { op, ...detectContradiction(input.statements) };
      if (op === "confidence") {
        const ev = evaluate(input);
        return { op, confidence: ev.holds ? 0.7 : 0.2, note: "heuristic_not_calibrated", learned: false, ...ev };
      }
      if (op === "architecture") return { op, spec: ARCHITECTURE_SPEC, learned: false };
      if (op === "toy_train") {
        lab.registerDataset();
        const trained = lab.trainToy(input);
        return { op, ...trained, learned: true, ruleBased: false, generalPurpose: false };
      }
      if (op === "toy_eval") return { op, ...lab.evaluateToy(input.modelId), learned: true, ruleBased: false };
      if (op === "rollback") return { op, ...lab.rollback(input.version), production: false };
      if (op === "promote") return { op, ...lab.promote(input) };
      if (op === "transformer_proto") return { op, ...xf.trainRun(input), learned: true, ruleBased: false };
      if (op === "transformer_eval") return { op, ...xf.evaluate(), learned: true };
      if (op === "transformer_compare") return { op, ...xf.compareLinear(input) };
      if (op === "reasoning_probe") return { op, ...runReasoning(xf), reasoningClaim: false };
      if (op === "reasoning_probe_p6") return { op, ...runReasoningPhase6(xf), reasoningClaim: false };
      if (op === "rule_reason") return { op, ...answer(input.text || input.q), generalIntelligence: false };
      if (op === "rule_eval") return { op, ...evaluateAll(), generalIntelligence: false };
      if (op === "infer_llm") return notImplemented("infer_llm");
      if (op === "transformer") return transformerDispatch();
      if (op === "crash") throw new Error("isolated_fault_probe");
      return notImplemented(op);
    },
  });
}

module.exports = { createThinkingEngine, tokenize, plan, evaluate, detectContradiction };
