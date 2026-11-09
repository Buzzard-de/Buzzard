const { matrix } = require("./engineStatus");
const { list } = require("./humanRemaining");
const { verifyOfficialFile, cloneAttempt } = require("../speech/officialVoiceGuard");
const { evaluateEgress } = require("../../security/egressPolicy");
const { probeHardware } = require("../thinking/hardwareProbe");
const { dependencyInventory } = require("../dependencyInventory");
const { isSalesEnabled } = require("../../salesMode");
const { runPhase10ThinkingEval } = require("../thinking/phase10Eval");
const { evaluateAll } = require("../thinking/ruleReasoner");

function board({ actorId = "sinan_bey" } = {}) {
  if (!["sinan_bey", "pusat", "esat_bey"].includes(actorId)) return { ok: false, code: "UNAUTHORIZED_ACTOR" };
  const p9 = evaluateAll();
  const p10 = runPhase10ThinkingEval();
  return {
    ok: true,
    agentSideComplete: true,
    liveVerified: false,
    productionReady: false,
    singlePercentComplete: null,
    budgetEur: 0,
    officialVoice: verifyOfficialFile(),
    clone: cloneAttempt({ actorId, requested: true }),
    humanRemaining: list(),
    engines: matrix(),
    thinkingProof: { phase9Rules: p9.passed, phase9Total: p9.total, phase10: p10.passed, phase10Total: p10.total, kind: "RULE_BASED", llmCompleted: false },
    egressOpenai: evaluateEgress({ destinationUrl: "https://api.openai.com/v1" }).allowed,
    egressAnthropic: evaluateEgress({ destinationUrl: "https://api.anthropic.com/v1" }).allowed,
    salesEnabled: isSalesEnabled(),
    hardware: probeHardware(),
    deps: dependencyInventory(),
    note: "Agent-side local stack is finished. Remaining items require Süleyman Bey.",
  };
}

module.exports = { board };
