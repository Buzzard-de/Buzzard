const { BRAND, IDENTITIES, campaignDraft, publishCampaign } = require("../marketing/influencerIdentities");
const { finalizePhase } = require("./phaseGateFinalize");

function evaluatePhase18Marketing() {
  const draft = campaignDraft({
    identityId: "bz_influencer_f",
    channel: "social",
    brief: "Seasonal dry-run",
  });
  const unknown = campaignDraft({ identityId: "real-person", channel: "social", brief: "no" });
  const publish = publishCampaign(draft);
  const syntheticOnly = IDENTITIES.every((identity) => identity.synthetic === true && identity.realPerson === false);

  const checks = [
    { id: "MKT_BRAND", ok: BRAND.disclosureRequired === true },
    { id: "MKT_IDENTITIES", ok: IDENTITIES.length >= 2 && syntheticOnly },
    {
      id: "MKT_CAMPAIGN_DRAFT",
      ok: draft.ok === true
        && draft.status === "DRAFT"
        && draft.publishAllowed === false
        && draft.requiresHumanApproval === true
        && unknown.ok === false
        && unknown.code === "UNKNOWN_IDENTITY"
        && publish.ok === false
        && publish.published === false
        && publish.code === "PUBLISH_BLOCKED",
    },
    { id: "MKT_LIVE_ADS", ok: false, status: "BLOCKED_EXTERNAL", note: "Paid media accounts" },
  ];

  return {
    ...finalizePhase(18, "Pazarlama ve marka", checks, ["MKT_LIVE_ADS"]),
    evidence: {
      ok: checks.filter((check) => check.id !== "MKT_LIVE_ADS").every((check) => check.ok),
      publishAllowed: draft.publishAllowed === true,
      publishCode: publish.code,
      published: publish.published === true,
      unknown: unknown.code,
    },
  };
}

module.exports = { evaluatePhase18Marketing };
