const { snapshot: automationHealth } = require("../pusat/automationHealth");
const { roster, MEMBERS } = require("../pusat/council");
const { SEED_IDS } = require("../buzzardNative/core/identityRegistry");
const { buildScorecard } = require("../ecosystem/scorecard");
const { finalizePhase } = require("./phaseGateFinalize");

const EXPECTED_ROSTER = Object.freeze(MEMBERS.map((member) => member.id));

function sameRoster(rows) {
  const ids = (rows || []).map((row) => row.id);
  return ids.length === EXPECTED_ROSTER.length && EXPECTED_ROSTER.every((id) => ids.includes(id));
}

function evaluatePhase13Pusat() {
  const health = automationHealth();
  const council = roster();
  const card = buildScorecard();
  const withoutSinan = council.filter((member) => member.id !== "sinan_bey");
  const withoutPusat = council.filter((member) => member.id !== "pusat");
  const seedIds = [...SEED_IDS];

  const checks = [
    { id: "PUSAT_HEALTH", ok: health.live === false && health.council?.liveCallsBlocked !== false },
    {
      id: "PUSAT_COUNCIL",
      ok: sameRoster(council)
        && council.some((member) => member.id === "sinan_bey")
        && council.some((member) => member.id === "pusat")
        && !sameRoster(withoutSinan)
        && !sameRoster(withoutPusat)
        && seedIds.length === 17
        && seedIds.includes("sinan_bey")
        && seedIds.includes("pusat"),
    },
    {
      id: "PUSAT_SCORECARD",
      ok: card != null && card.live === false && card.completeClaim === false && card.salesEnabled === false,
    },
    { id: "PUSAT_LIVE_VOICE", ok: false, status: "BLOCKED_EXTERNAL", note: "Live telephony stack" },
  ];

  return {
    ...finalizePhase(13, "Pusat ve AI Kurmay", checks, ["PUSAT_LIVE_VOICE"]),
    evidence: {
      ok: checks.filter((check) => check.id !== "PUSAT_LIVE_VOICE").every((check) => check.ok),
      roster: council.length,
      seed: seedIds.length,
      missingSinanFails: !sameRoster(withoutSinan),
      missingPusatFails: !sameRoster(withoutPusat),
      scoreLive: card?.live === true,
      scoreClaim: card?.completeClaim === true,
    },
  };
}

module.exports = { evaluatePhase13Pusat };
