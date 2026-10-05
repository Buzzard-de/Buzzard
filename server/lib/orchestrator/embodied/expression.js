const { EXPRESSIONS, EMBODIED_STATE } = require("./constants");

function expressionFor(state, { risk, failed, listening } = {}) {
  if (failed) return "concerned";
  if (risk === "HIGH") return "focused";
  if (listening || state === EMBODIED_STATE.LISTENING) return "listening";
  switch (state) {
    case EMBODIED_STATE.SPEAKING:
      return "speaking";
    case EMBODIED_STATE.THINKING:
    case EMBODIED_STATE.SEARCHING:
      return "thinking";
    case EMBODIED_STATE.WORKING:
    case EMBODIED_STATE.USING_COMPUTER:
    case EMBODIED_STATE.READING:
    case EMBODIED_STATE.WRITING:
      return "focused";
    case EMBODIED_STATE.HANDOFF:
      return "concerned";
    case EMBODIED_STATE.IDLE:
      return "friendly";
    default:
      return "neutral";
  }
}

function clampExpression(name) {
  return EXPRESSIONS.includes(name) ? name : "neutral";
}

module.exports = { expressionFor, clampExpression };
