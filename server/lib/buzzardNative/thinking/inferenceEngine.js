/**
 * Structured rule inference. RULE_BASED. Not an LLM.
 */
function clone(obj) {
  return JSON.parse(JSON.stringify(obj || {}));
}

function contradiction(facts) {
  const conflicts = [];
  for (const [k, v] of Object.entries(facts || {})) {
    if (k.endsWith("_not") && facts[k.slice(0, -4)] === v) {
      conflicts.push({ key: k.slice(0, -4), a: facts[k.slice(0, -4)], b: v });
    }
  }
  for (const [k, v] of Object.entries(facts || {})) {
    const neg = `not_${k}`;
    if (Object.prototype.hasOwnProperty.call(facts, neg) && Boolean(facts[neg]) === Boolean(v)) {
      conflicts.push({ key: k, a: v, b: facts[neg] });
    }
  }
  return { contradiction: conflicts.length > 0, conflicts };
}

function missingFor(rule, facts) {
  return Object.keys(rule.if || {}).filter((k) => !Object.prototype.hasOwnProperty.call(facts, k));
}

function matches(rule, facts) {
  return Object.entries(rule.if || {}).every(([k, v]) => facts[k] === v);
}

function infer({ facts = {}, rules = [], maxHops = 8 } = {}) {
  const derived = clone(facts);
  const hops = [];
  const unknown = [];
  const assumptions = [];
  for (let hop = 0; hop < maxHops; hop += 1) {
    let progressed = false;
    for (const rule of rules) {
      const miss = missingFor(rule, derived);
      if (miss.length) {
        unknown.push({ rule: rule.id, missing: miss });
        continue;
      }
      if (matches(rule, derived)) {
        for (const [k, v] of Object.entries(rule.then || {})) {
          if (!Object.prototype.hasOwnProperty.call(derived, k)) {
            derived[k] = v;
            hops.push({ hop, rule: rule.id, added: { [k]: v }, kind: "modus_ponens" });
            progressed = true;
          } else if (derived[k] !== v) {
            hops.push({ hop, rule: rule.id, conflict: { key: k, have: derived[k], want: v } });
          }
        }
      }
    }
    if (!progressed) break;
  }
  const contra = contradiction(derived);
  return {
    ok: true,
    kind: "RULE_BASED",
    llmCompleted: false,
    generalIntelligence: false,
    facts: derived,
    hops,
    unknown: unknown.slice(0, 12),
    assumptions,
    contradiction: contra.contradiction,
    conflicts: contra.conflicts,
    verifiedKeys: Object.keys(facts),
    derivedKeys: Object.keys(derived).filter((k) => !Object.prototype.hasOwnProperty.call(facts, k)),
  };
}

const DEFAULT_RULES = Object.freeze([
  { id: "rain_wet", if: { rain: true }, then: { ground_wet: true } },
  { id: "wet_slip", if: { ground_wet: true }, then: { slip_risk: "elevated" } },
  { id: "egress_deny", if: { destination: "openai" }, then: { allowed: false, code: "EGRESS_DENIED" } },
  { id: "clone_gate", if: { cloneAuthorized: false }, then: { officialTts: false } },
  { id: "stranger", if: { actor: "stranger" }, then: { authorized: false } },
]);

module.exports = { infer, contradiction, DEFAULT_RULES };
