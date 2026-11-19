const { assessTextile } = require("../storefront/textileProgram");
const { runSandboxSession } = require("../storefront/textileSandbox");
const { finalizePhase } = require("./phaseGateFinalize");

function evaluatePhase9TextileAi() {
  const assess = assessTextile();
  const session = runSandboxSession({
    audience: "professional",
    occasion: "office",
    consentMeasurements: true,
    measurements: { chest: 100, waist: 85 },
    requestTryOn: true,
    consentPhoto: true,
  });

  const checks = [
    { id: "TEX_ASSESS_SANDBOX", ok: assess.liveVerified === false && assess.completeClaim === false },
    { id: "TEX_RECOMMEND", ok: session.ok === true && session.recommendation?.line },
    { id: "TEX_OUTFIT", ok: session.outfit?.liveTryOn === false },
    { id: "TEX_TRYON_DEMO", ok: session.tryOn == null || session.tryOn.live !== true },
    { id: "TEX_LIVE_TRYON", ok: false, status: "BLOCKED_EXTERNAL", note: "Live vision model required" },
  ];

  return finalizePhase(9, "Tekstil AI (canlı)", checks, ["TEX_LIVE_TRYON"]);
}

module.exports = { evaluatePhase9TextileAi };