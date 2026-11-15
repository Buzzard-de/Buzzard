/**
 * Eight-step problem solver. RULE_BASED scaffolding, not general problem-solving.
 */
const { infer, DEFAULT_RULES } = require("./inferenceEngine");

const HUMAN_GATES = Object.freeze([
  "GIT_PUSH",
  "MERGE",
  "DEPLOY",
  "PRODUCTION_RESTORE",
  "DATA_DELETE",
  "LOOSEN_SECURITY",
  "CHANGE_EGRESS_DENY",
  "ENABLE_SALES_OR_PAYMENTS",
  "ENABLE_LIVE_CARRIER",
  "CLONE_OFFICIAL_VOICE",
]);

function solve({ problem, facts = {}, rules = DEFAULT_RULES } = {}) {
  const defined = String(problem || "").trim() || "unspecified";
  const needed = Object.keys(rules.reduce((acc, r) => ({ ...acc, ...(r.if || {}) }), {}));
  const unknown = needed.filter((k) => !Object.prototype.hasOwnProperty.call(facts, k));
  const inf = infer({ facts, rules });
  const alts = [];
  if (inf.facts.allowed === false) alts.push({ id: "keep_deny", action: "block_egress", risk: "low" });
  if (unknown.length) alts.push({ id: "ask_human", action: "request_facts", risk: "low" });
  alts.push({ id: "proceed_known", action: "apply_derived", risk: inf.contradiction ? "high" : "medium" });
  const chosen = inf.contradiction ? alts.find((a) => a.id === "ask_human") || alts[0] : alts[alts.length - 1];
  const human = HUMAN_GATES.some((g) => defined.toUpperCase().includes(g) || defined.toLowerCase().includes("push"));
  return {
    ok: true,
    kind: "RULE_BASED",
    llmCompleted: false,
    steps: {
      1: { define: defined },
      2: { needed },
      3: { unknown },
      4: { alternatives: alts },
      5: { compare: alts.map((a) => a.id) },
      6: { risks: alts.map((a) => ({ id: a.id, risk: a.risk })) },
      7: { chosen, reason: inf.contradiction ? "conflict_stop" : "derived_facts" },
      8: { testable: { facts: inf.facts, contradiction: inf.contradiction } },
    },
    inference: inf,
    humanGateRequired: human,
  };
}

module.exports = { solve, HUMAN_GATES };
