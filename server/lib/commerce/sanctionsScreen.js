/**
 * Trade compliance screen. No live list. Uncertainty → human review.
 */
const { screenTrade } = require("./ab27Logistics");
const { createApprovalCenter, RISK } = require("../pusat/humanApproval");

const DUAL_USE_HINTS = Object.freeze(["dual-use", "dual_use", "nuklear", "missile", "encryption-restricted"]);

function unclearMatch({ parties = [], goodsCode, dualUse, notes } = {}) {
  const blob = [goodsCode, notes, ...parties.map((p) => `${p.name || ""} ${p.country || ""}`)]
    .join(" ")
    .toLowerCase();
  if (dualUse === true) return { uncertain: true, reason: "DUAL_USE_DECLARED" };
  if (DUAL_USE_HINTS.some((hint) => blob.includes(hint))) return { uncertain: true, reason: "DUAL_USE_HINT" };
  if (parties.length && parties.some((p) => !p.cleared)) return { uncertain: true, reason: "PARTY_NOT_CLEARED" };
  if (parties.length || goodsCode) return { uncertain: true, reason: "NO_LIVE_SANCTIONS_FEED" };
  return { uncertain: false, reason: null };
}

function screenCompliance(input = {}) {
  const lane = screenTrade(input);
  if (lane.status === "HUMAN_REVIEW") {
    return { ...lane, sanctionsCleared: false, uncertainty: lane.code };
  }

  const match = unclearMatch(input);
  if (match.uncertain) {
    const approvals = createApprovalCenter();
    const held = approvals.submit({
      action: "SANCTIONS_UNCERTAIN",
      requestedBy: "compliance_ai",
      reason: match.reason,
      risk: RISK.HIGH,
      payload: {
        destination: input.destination,
        goodsCode: input.goodsCode,
        parties: input.parties || [],
        dualUse: Boolean(input.dualUse),
      },
    });
    if (typeof input.persistHold === "function") {
      try {
        input.persistHold({ destination: input.destination, reason: match.reason, payload: held.item.payload });
      } catch {
        /* best-effort */
      }
    }
    return {
      ok: false,
      autoApproved: false,
      status: "HUMAN_REVIEW",
      code: match.reason,
      sanctionsCleared: false,
      approval: held.item,
      sources: lane.sources,
    };
  }

  return {
    ...lane,
    sanctionsCleared: false,
    status: "INTRA_EU_ESTIMATE",
    note: "Estimate only. No live sanctions clearance.",
  };
}

module.exports = { screenCompliance, unclearMatch, DUAL_USE_HINTS };
