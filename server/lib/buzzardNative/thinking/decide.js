const crypto = require("crypto");
const { solve } = require("./solve");

function createDecisionLog() {
  const rows = [];
  function decide({ question, facts = {}, actorId = "sinan_bey" } = {}) {
    const s = solve({ problem: question, facts });
    const risk = s.inference.contradiction ? "high" : s.humanGateRequired ? "high" : "medium";
    const confidence = s.inference.derivedKeys.length ? 0.6 : s.steps[3].unknown.length ? 0.3 : 0.5;
    const rec = {
      id: `dec_${crypto.randomBytes(3).toString("hex")}`,
      at: new Date().toISOString(),
      actorId,
      question,
      chosen: s.steps[7].chosen,
      reason: s.steps[7].reason,
      risk,
      confidence,
      alternatives: s.steps[4].alternatives,
      humanGateRequired: s.humanGateRequired,
      outcome: "pending",
      kind: "RULE_BASED",
    };
    rows.push(rec);
    return rec;
  }
  function recordOutcome(id, outcome) {
    const row = rows.find((r) => r.id === id);
    if (!row) return { ok: false, code: "DECISION_NOT_FOUND" };
    row.outcome = outcome;
    return { ok: true, row };
  }
  return {
    decide,
    recordOutcome,
    history: () => rows.slice(),
  };
}

module.exports = { createDecisionLog };
