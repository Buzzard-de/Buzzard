const ROLES = Object.freeze([
  { id: "logistics_ai", task: "monitor_and_recommend", canCommit: false, data: "logistics_ops" },
  { id: "price_assistant", task: "compare_rates_when_known", canCommit: false, data: "rates_unknown_unless_sourced" },
  { id: "stock_assistant", task: "supplier_ready_status", canCommit: false, data: "supplier_not_carrier" },
  { id: "customer_assistant", task: "tracking_copy_verified_only", canCommit: false, data: "no_unverified_delivery_claims" },
  { id: "sales_analysis_assistant", task: "shipping_cost_vs_margin", canCommit: false, data: "no_live_prices" },
  { id: "customs_ai", task: "trade_compliance_hold_if_uncertain", canCommit: false, data: "restricted" },
  { id: "tax_ai", task: "country_tax_effects", canCommit: false, data: "restricted" },
  { id: "esat_bey", task: "security_monitor", canCommit: false, data: "security", soleDefense: false },
  { id: "dogu_bey", task: "carrier_research", canCommit: false, data: "public_research" },
  { id: "pusat", task: "orchestrate", canCommit: false, data: "route_only" },
]);

function councilStatus() {
  return {
    liveShipment: false,
    commercialCommitForbidden: true,
    uncontrolledShare: false,
    roles: ROLES,
  };
}

function mayShare({ fromId, classification } = {}) {
  if (classification === "restricted" && fromId !== "esat_bey" && fromId !== "customs_ai" && fromId !== "tax_ai") {
    return false;
  }
  return classification === "public" || classification === "shared";
}

module.exports = { ROLES, councilStatus, mayShare };
