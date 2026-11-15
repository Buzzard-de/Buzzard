/**
 * Approved synthetic marketing identities. Not real people.
 */
const BRAND = Object.freeze({
  colors: ["#111111", "#C9A227"],
  name: "Buzzard",
  disclosureRequired: true,
});

const IDENTITIES = Object.freeze([
  {
    id: "bz_influencer_f",
    displayName: "Nova",
    presentation: "female",
    synthetic: true,
    realPerson: false,
    disclosure: "KI-generierte Markenfigur. Keine echte Person.",
  },
  {
    id: "bz_influencer_m",
    displayName: "Adler",
    presentation: "male",
    synthetic: true,
    realPerson: false,
    disclosure: "KI-generierte Markenfigur. Keine echte Person.",
  },
]);

function campaignDraft({ identityId, channel, brief } = {}) {
  const identity = IDENTITIES.find((i) => i.id === identityId);
  if (!identity) return { ok: false, code: "UNKNOWN_IDENTITY" };
  return {
    ok: true,
    status: "DRAFT",
    identity,
    channel,
    brief,
    brand: BRAND,
    publishAllowed: false,
    requiresHumanApproval: true,
  };
}

module.exports = { BRAND, IDENTITIES, campaignDraft };
