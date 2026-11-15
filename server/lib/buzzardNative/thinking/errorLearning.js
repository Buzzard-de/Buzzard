/**
 * Controlled outcome memory. Not neural learning, not general intelligence.
 */
function createErrorLearner() {
  const log = [];
  const banned = new Set();
  function record({ problem, action, outcome }) {
    log.push({ problem, action, outcome, at: Date.now() });
    if (outcome === "fail") banned.add(`${problem}::${action}`);
    return { ok: true, kind: "RULE_BASED", neural: false, banned: banned.size };
  }
  function allowed(problem, action) {
    return !banned.has(`${problem}::${action}`);
  }
  function propose({ problem, actions = [] }) {
    const ok = actions.filter((a) => allowed(problem, a));
    return {
      kind: "RULE_BASED",
      learnedNeural: false,
      chosen: ok[0] || null,
      rejected: actions.filter((a) => !allowed(problem, a)),
      history: log.length,
    };
  }
  return { record, propose, log: () => log.slice() };
}

module.exports = { createErrorLearner };
