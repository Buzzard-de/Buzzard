import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { runPhase12Eval } = require("../lib/buzzardNative/thinking/phase12Eval.js");
const { runPhase12 } = require("../lib/buzzardNative/thinking/phase12Run.js");
const { createErrorLearner } = require("../lib/buzzardNative/thinking/errorLearning.js");
const { runPhase10ThinkingEval } = require("../lib/buzzardNative/thinking/phase10Eval.js");

describe("Phase 12 reasoning", () => {
  it("keeps Phase 10 structured eval and adds held-out plus error memory", () => {
    expect(runPhase10ThinkingEval().passed).toBe(runPhase10ThinkingEval().total);
    const L = createErrorLearner();
    L.record({ problem: "x", action: "bad", outcome: "fail" });
    expect(L.propose({ problem: "x", actions: ["bad", "good"] }).chosen).toBe("good");
    const ev = runPhase12Eval();
    expect(ev.llmCompleted).toBe(false);
    expect(ev.heldOut.passed).toBe(ev.heldOut.total);
    expect(ev.productionTransformer.code).toBe("NOT_IMPLEMENTED");
    expect(runPhase12().budgetEur).toBe(0);
    expect(runPhase12().official.unchanged).toBe(true);
  });
});
