const { runPhase9Evidence } = require("../storefront/phase9Evidence");
const { finalizePhase } = require("./phaseGateFinalize");

function evaluatePhase9TextileAi() {
  const evidence = runPhase9Evidence();
  const checks = [
    { id: "TEX_ASSESS_SANDBOX", ok: evidence.ok === true && evidence.live === false },
    { id: "TEX_RECOMMEND", ok: evidence.workwear === "workwear" && evidence.unknown === "daily" },
    { id: "TEX_OUTFIT", ok: evidence.ok === true },
    { id: "TEX_TRYON_DEMO", ok: evidence.tryOn === false && evidence.image === "BLOCKED" },
    { id: "TEX_LIVE_TRYON", ok: false, status: "BLOCKED_EXTERNAL", note: "Live vision model required" },
  ];
  return {
    ...finalizePhase(9, "Tekstil AI (canlı)", checks, ["TEX_LIVE_TRYON"]),
    evidence,
  };
}

module.exports = { evaluatePhase9TextileAi };
