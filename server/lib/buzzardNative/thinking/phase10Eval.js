/**
 * Held-out structured tests. Not keyword match. Not the Phase 9 FACTS lookup.
 */
const { infer, DEFAULT_RULES } = require("./inferenceEngine");
const { solve } = require("./solve");
const { plan, replan } = require("./planEngine");
const { createDecisionLog } = require("./decide");

function cases() {
  return [
    {
      id: "math_logic",
      cat: "math",
      run: () => {
        const r = infer({
          facts: { a: 2, b: 2 },
          rules: [{ id: "sum", if: { a: 2, b: 2 }, then: { sum: 4 } }],
        });
        return r.facts.sum === 4 && r.kind === "RULE_BASED";
      },
    },
    {
      id: "cond_infer",
      cat: "conditional",
      run: () => infer({ facts: { rain: true }, rules: DEFAULT_RULES }).facts.ground_wet === true,
    },
    {
      id: "multi_hop",
      cat: "multi_step",
      run: () => infer({ facts: { rain: true }, rules: DEFAULT_RULES }).facts.slip_risk === "elevated",
    },
    {
      id: "contra",
      cat: "contradiction",
      run: () =>
        infer({
          facts: { door: "open", not_door: "open" },
          rules: [],
        }).contradiction === true,
    },
    {
      id: "cause_effect",
      cat: "cause",
      run: () => {
        const r = infer({ facts: { rain: true }, rules: DEFAULT_RULES });
        return r.hops.some((h) => h.rule === "rain_wet") && r.facts.ground_wet === true;
      },
    },
    {
      id: "solve_shape",
      cat: "problem",
      run: () => {
        const s = solve({ problem: "wet floor risk", facts: { rain: true } });
        return s.steps[8].testable.facts.slip_risk === "elevated" && s.llmCompleted === false;
      },
    },
    {
      id: "plan_deps",
      cat: "planning",
      run: () => {
        const p = plan({
          tasks: [
            { id: "a", title: "analyze", deps: [] },
            { id: "b", title: "report", deps: ["a"] },
          ],
        });
        return p.ordered.join(",") === "a,b";
      },
    },
    {
      id: "replan",
      cat: "planning",
      run: () => {
        const p = plan({ tasks: [{ id: "a", title: "a", deps: [] }] });
        const r = replan(p, "a");
        return r.ordered.includes("a_retry");
      },
    },
    {
      id: "risk_gate",
      cat: "risk",
      run: () => solve({ problem: "GIT_PUSH main", facts: {} }).humanGateRequired === true,
    },
    {
      id: "missing",
      cat: "unknown",
      run: () => {
        const r = infer({ facts: {}, rules: DEFAULT_RULES });
        return r.facts.ground_wet === undefined && r.unknown.length > 0;
      },
    },
    {
      id: "reject_false",
      cat: "false_premise",
      run: () => {
        const r = infer({ facts: { rain: false }, rules: DEFAULT_RULES });
        return r.facts.ground_wet === undefined;
      },
    },
    {
      id: "uncertain_q",
      cat: "uncertainty",
      run: () => {
        const log = createDecisionLog();
        const d = log.decide({ question: "unpublished revenue?", facts: {} });
        return d.confidence <= 0.5 && d.kind === "RULE_BASED";
      },
    },
    {
      id: "egress",
      cat: "security",
      run: () => infer({ facts: { destination: "openai" }, rules: DEFAULT_RULES }).facts.allowed === false,
    },
    {
      id: "clone_gate",
      cat: "security",
      run: () => infer({ facts: { cloneAuthorized: false }, rules: DEFAULT_RULES }).facts.officialTts === false,
    },
  ];
}

function runPhase10ThinkingEval() {
  const rows = cases().map((c) => {
    let pass = false;
    let error = null;
    try {
      pass = c.run() === true;
      if (!pass) error = "structured_assertion_failed";
    } catch (err) {
      error = String(err.message || err);
    }
    return { id: c.id, cat: c.cat, pass, error, match: "structured_not_keyword" };
  });
  const passed = rows.filter((r) => r.pass).length;
  return {
    passed,
    total: rows.length,
    rate: passed / rows.length,
    kind: "RULE_BASED",
    llmCompleted: false,
    generalIntelligence: false,
    rows,
  };
}

module.exports = { cases, runPhase10ThinkingEval };
