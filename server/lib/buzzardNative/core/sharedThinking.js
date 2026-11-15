const { infer, DEFAULT_RULES } = require("../thinking/inferenceEngine");
const { getAgent } = require("./identityRegistry");
const { canUse } = require("./capabilityRegistry");
const { check } = require("./permissionEngine");

function think({ agentId, facts = {}, extraRules = [] }) {
  const agent = getAgent(agentId);
  if (!agent) return { ok: false, code: "UNKNOWN_AGENT" };
  if (!canUse(agentId, "thinking")) return { ok: false, code: "CAPABILITY_DENIED" };
  const expertRule = {
    id: "expertise",
    if: { ask_expertise: true },
    then: { expertise: agent.expertise[0], agent: agentId },
  };
  const result = infer({ facts: { ...facts, agent: agentId }, rules: [...DEFAULT_RULES, expertRule, ...extraRules] });
  return {
    ok: true,
    kind: "RULE_BASED",
    llmCompleted: false,
    agentId,
    expertise: agent.expertise,
    used: result.facts,
    source: "closed_world_and_identity",
    assumption: "facts_provided_by_caller",
    uncertainty: result.unknown.length ? "missing_facts" : "low_rule_confidence",
    reason: result.hops.map((h) => h.rule),
    confidence: result.derivedKeys.length ? 0.6 : 0.35,
    humanGate: check(agentId, "DEPLOY").ok === false && facts.requireDeploy ? true : Boolean(facts.requireDeploy),
    generalIntelligence: false,
  };
}

module.exports = { think };
