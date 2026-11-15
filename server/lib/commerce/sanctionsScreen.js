/**
 * Trade compliance screen. No live list. Uncertainty → human review.
 */
const { screenTrade } = require("./ab27Logistics");
const { createApprovalCenter, RISK } = require("../pusat/humanApproval");
const { watchComplianceHold } = require("../security/esatBey");

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
    const esat = watchComplianceHold({ code: lane.code, destination: input.destination });
    return { ...lane, sanctionsCleared: false, uncertainty: lane.code, esat };
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
    const esat = watchComplianceHold({ code: match.reason, destination: input.destination });
    return {
      ok: false,
      autoApproved: false,
      status: "HUMAN_REVIEW",
      code: match.reason,
      sanctionsCleared: false,
      approval: held.item,
      esat,
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

function listFreshness({ retrievedAt, maxAgeHours = 24 } = {}) {
  if (!retrievedAt) return { fresh: false, code: "STALE_OR_MISSING_LIST" };
  const age = Date.now() - new Date(retrievedAt).getTime();
  if (Number.isNaN(age) || age > maxAgeHours * 3600 * 1000) {
    return { fresh: false, code: "STALE_LIST" };
  }
  return { fresh: true, code: "FRESH" };
}

function decideOutcome(input = {}) {
  const freshness = listFreshness(input);
  if (!freshness.fresh) return { outcome: "HUMAN_REVIEW", code: freshness.code };
  if (input.prohibited === true) return { outcome: "PROHIBITED", code: "LISTED_PARTY" };
  if (input.licenseRequired === true) return { outcome: "LICENSE_REQUIRED", code: "EXPORT_LICENSE" };
  if (input.exactMatch === true) return { outcome: "MATCH_SUSPECTED", code: "NAME_MATCH" };
  if (input.dualUse === true) return { outcome: "REVIEW_REQUIRED", code: "DUAL_USE_DECLARED" };
  return { outcome: "HUMAN_REVIEW", code: "NO_LIVE_FEED" };
}

const SOURCE_ADAPTERS = Object.freeze([
  { id: "eu_sanctions_map", url: "https://www.sanctionsmap.eu", live: false, status: "BLOCKED" },
  { id: "un_sanctions", url: "https://www.un.org/securitycouncil/sanctions", live: false, status: "BLOCKED" },
  { id: "de_federal", url: "https://www.bafa.de", live: false, status: "BLOCKED" },
  { id: "eu_dual_use", url: "https://eur-lex.europa.eu", live: false, status: "BLOCKED" },
]);

const RESCREEN_STAGES = Object.freeze([
  "BEFORE_ORDER_ACCEPTANCE",
  "BEFORE_SUPPLIER_SELECTION",
  "BEFORE_PAYMENT_AUTHORIZATION",
  "BEFORE_SHIPMENT",
  "ON_LIST_CHANGE",
  "ON_DESTINATION_OR_PARTY_CHANGE",
]);

function classifyGoods({ hs, cn, taric, description = "" } = {}) {
  const incomplete = !hs && !cn && !taric && String(description).trim().length < 12;
  return {
    hs: hs || null,
    cn: cn || null,
    taric: taric || null,
    binding: false,
    incomplete,
    note: incomplete
      ? "Incomplete description — not a legally binding classification."
      : "Local hint only. Not a binding HS/CN/TARIC ruling.",
  };
}

function rescreen(input = {}) {
  const stage = RESCREEN_STAGES.includes(input.stage) ? input.stage : "BEFORE_ORDER_ACCEPTANCE";
  const decision = decideOutcome(input);
  if (decision.outcome !== "HUMAN_REVIEW" && input.autoApprove === true) {
    return { ok: false, stage, outcome: "HUMAN_REVIEW", code: "AUTO_APPROVE_FORBIDDEN" };
  }
  const screen = screenCompliance(input);
  return {
    ...screen,
    stage,
    outcome: screen.status === "HUMAN_REVIEW" ? "HUMAN_REVIEW" : decision.outcome,
    autoApproved: false,
    liveList: false,
  };
}

module.exports = {
  screenCompliance,
  unclearMatch,
  DUAL_USE_HINTS,
  listFreshness,
  decideOutcome,
  SOURCE_ADAPTERS,
  RESCREEN_STAGES,
  classifyGoods,
  rescreen,
};
