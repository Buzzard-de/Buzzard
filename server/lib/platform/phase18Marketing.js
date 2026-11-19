const { BRAND, IDENTITIES, campaignDraft } = require("../marketing/influencerIdentities");
const { finalizePhase } = require("./phaseGateFinalize");

function evaluatePhase18Marketing() {
  const draft = campaignDraft({
    identityId: "bz_influencer_f",
    channel: "social",
    brief: "Seasonal dry-run",
  });
  const syntheticOnly = IDENTITIES.every((i) => i.synthetic === true && i.realPerson === false);

  const checks = [
    { id: "MKT_BRAND", ok: BRAND.disclosureRequired === true },
    { id: "MKT_IDENTITIES", ok: IDENTITIES.length >= 2 && syntheticOnly },
    { id: "MKT_CAMPAIGN_DRAFT", ok: draft.ok === true && draft.publishAllowed === false },
    { id: "MKT_LIVE_ADS", ok: false, status: "BLOCKED_EXTERNAL", note: "Paid media accounts" },
  ];

  return finalizePhase(18, "Pazarlama ve marka", checks, ["MKT_LIVE_ADS"]);
}

module.exports = { evaluatePhase18Marketing };