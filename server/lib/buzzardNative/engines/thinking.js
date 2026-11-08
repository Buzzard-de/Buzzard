/**
 * Rule-based thinking prototype. Not a trained language model.
 */
const { createEngine, notImplemented } = require("../engineContract");

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
  return createEngine({
    id: "thinking",
    capabilities: ["tokenize", "plan", "evaluate", "contradiction", "confidence"],
    executeImpl(input) {
      const op = input.op || "plan";
      if (op === "tokenize") return { op, tokens: tokenize(input.text), model: "whitespace_rules" };
      if (op === "plan") return { op, ...plan(input.goal || input.text) };
      if (op === "evaluate") return { op, ...evaluate(input) };
      if (op === "contradiction") return { op, ...detectContradiction(input.statements) };
      if (op === "confidence") {
        const ev = evaluate(input);
        return { op, confidence: ev.holds ? 0.7 : 0.2, note: "heuristic_not_calibrated", ...ev };
      }
      if (op === "infer_llm") return notImplemented("infer_llm");
      if (op === "crash") throw new Error("isolated_fault_probe");
      return notImplemented(op);
    },
  });
}

module.exports = { createThinkingEngine, tokenize, plan, evaluate, detectContradiction };
