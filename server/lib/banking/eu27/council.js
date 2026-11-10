/**
 * Banking duties for the existing 17-seat council.
 * Akın Bey is pricing_ai. Sencer Bey is sales_analysis_ai.
 * No seat can move money.
 */
const { OFFICIAL_DISPLAY_NAMES, NATIVE_SEED_IDS } = require("../../buzzardNative/core/councilAliasMap");
const { coverage } = require("./inventory");

const DUTIES = Object.freeze({
  pusat: Object.freeze(["COORDINATE"]),
  nedim_bey: Object.freeze(["TAX_AND_PAYMENT_RULES", "COMPLIANCE_BOUNDARY"]),
  pricing_ai: Object.freeze(["PAYMENT_COST"]),
  esat_bey: Object.freeze(["FINANCIAL_SYSTEM_SECURITY"]),
  dogu_bey: Object.freeze(["INSTITUTION_RESEARCH"]),
  sales_analysis_ai: Object.freeze(["FINANCIAL_PERFORMANCE"]),
});

const MONEY_ACTIONS = new Set(["TRANSFER", "CAPTURE", "PAYOUT", "REFUND_EXECUTE", "CHARGEBACK_SETTLE"]);

function act({ agentId, duty, action = "REVIEW" } = {}) {
  if (!NATIVE_SEED_IDS.includes(agentId)) return { ok: false, code: "UNKNOWN_AGENT", moneyMoved: false };
  if (MONEY_ACTIONS.has(action)) {
    return { ok: false, code: "AI_MONEY_MOVEMENT_DENIED", agentId, moneyMoved: false, live: false };
  }
  const allowed = DUTIES[agentId] || [];
  if (!allowed.includes(duty)) {
    return { ok: false, code: "OUT_OF_AUTHORITY", agentId, display: OFFICIAL_DISPLAY_NAMES[agentId], moneyMoved: false };
  }
  if (duty === "INSTITUTION_RESEARCH") {
    const report = coverage();
    return { ok: true, code: "RESEARCH_REPORTED", complete: report.complete, live: false, moneyMoved: false };
  }
  return {
    ok: true,
    code: "DUTY_ACKNOWLEDGED",
    agentId,
    display: OFFICIAL_DISPLAY_NAMES[agentId],
    duty,
    live: false,
    moneyMoved: false,
  };
}

module.exports = { DUTIES, act };
