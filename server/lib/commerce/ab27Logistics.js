/**
 * AB27 logistics / trade screens. High-risk and unclear cases go to humans.
 */
const { AB27 } = require("./ab27Tax");
const { createApprovalCenter, RISK } = require("../pusat/humanApproval");

const OFFICIAL_SOURCES = Object.freeze([
  { title: "EU sanctions map", url: "https://www.sanctionsmap.eu", retrievedAt: "2026-10-22" },
  { title: "EUR-Lex sanctions", url: "https://eur-lex.europa.eu", retrievedAt: "2026-10-22" },
  { title: "Taxation and Customs Union", url: "https://taxation-customs.ec.europa.eu", retrievedAt: "2026-10-22" },
]);

const COUNTRY_RULES = Object.freeze(
  Object.fromEntries(
    AB27.map((code) => [
      code,
      {
        country: code,
        carrierNotes: "Use licensed carrier contract per destination. Not a live rate shop.",
        typicalTransitDays: code === "DE" || code === "AT" || code === "NL" || code === "BE" ? "1-3" : "2-7",
        returnsWindowDays: 14,
        customsUnion: true,
        holidayCalendar: "national + EU public holidays — confirm locally before promising SLA",
      },
    ])
  )
);

function screenTrade({ origin = "DE", destination, goodsCode, value = 0 } = {}) {
  const dest = String(destination || "").toUpperCase();
  const inUnion = AB27.includes(dest) || dest === "GR";
  const approvals = createApprovalCenter();

  if (!inUnion) {
    const held = approvals.submit({
      action: "TRADE_SCREEN",
      requestedBy: "logistics_ai",
      reason: `Destination ${dest} is outside the AB27 table — human trade review required`,
      risk: RISK.HIGH,
      payload: { origin, destination: dest, goodsCode, value },
    });
    return {
      ok: false,
      autoApproved: false,
      status: "HUMAN_REVIEW",
      code: "OUTSIDE_AB27",
      approval: held.item,
      sources: OFFICIAL_SOURCES,
    };
  }

  if (Number(value) >= 10000) {
    const held = approvals.submit({
      action: "HIGH_VALUE_SHIPMENT",
      requestedBy: "logistics_ai",
      reason: "High-value shipment requires human compliance review",
      risk: RISK.HIGH,
      payload: { origin, destination: dest, goodsCode, value },
    });
    return {
      ok: false,
      autoApproved: false,
      status: "HUMAN_REVIEW",
      code: "HIGH_VALUE",
      approval: held.item,
      sources: OFFICIAL_SOURCES,
    };
  }

  return {
    ok: true,
    autoApproved: false,
    status: "INTRA_EU_ESTIMATE",
    destination: dest,
    rules: COUNTRY_RULES[dest === "GR" ? "EL" : dest],
    sanctionsCleared: false,
    sanctionsNote: "No live sanctions feed is connected. Do not treat this estimate as clearance.",
    sources: OFFICIAL_SOURCES,
  };
}

function quoteLane({ destination, weightKg = 1 } = {}) {
  const dest = String(destination || "").toUpperCase();
  const destKey = dest === "GR" ? "EL" : dest;
  if (!COUNTRY_RULES[destKey]) {
    return { ok: false, code: "UNKNOWN_DESTINATION", blocked: true };
  }
  const base = destKey === "DE" ? 4.9 : 8.9;
  const estimate = Math.round((base + Number(weightKg) * 1.2) * 100) / 100;
  return {
    ok: true,
    destination: destKey,
    currency: "EUR",
    shippingEstimate: estimate,
    dryRun: true,
    liveCarrier: false,
    transitDays: COUNTRY_RULES[destKey].typicalTransitDays,
    returnsWindowDays: COUNTRY_RULES[destKey].returnsWindowDays,
  };
}

module.exports = {
  OFFICIAL_SOURCES,
  COUNTRY_RULES,
  screenTrade,
  quoteLane,
};
