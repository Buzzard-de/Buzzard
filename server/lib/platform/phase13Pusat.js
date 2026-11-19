const { snapshot: automationHealth } = require("../pusat/automationHealth");
const { roster } = require("../pusat/council");
const { buildScorecard } = require("../ecosystem/scorecard");
const { finalizePhase } = require("./phaseGateFinalize");

function evaluatePhase13Pusat() {
  const health = automationHealth();
  const council = roster();
  const card = buildScorecard();

  const checks = [
    { id: "PUSAT_HEALTH", ok: health.live === false && health.council?.liveCallsBlocked !== false },
    { id: "PUSAT_COUNCIL", ok: council.length > 0 },
    { id: "PUSAT_SCORECARD", ok: card != null && card.live !== true },
    { id: "PUSAT_LIVE_VOICE", ok: false, status: "BLOCKED_EXTERNAL", note: "Live telephony stack" },
  ];

  return finalizePhase(13, "Pusat ve AI Kurmay", checks, ["PUSAT_LIVE_VOICE"]);
}

module.exports = { evaluatePhase13Pusat };