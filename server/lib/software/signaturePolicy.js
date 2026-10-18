/**
 * Signature-delivery policy. Thresholds are configurable defaults, not invented production rules.
 * Customer preference cannot override mandatory risk controls.
 */

const { MIN_NET_PROFIT_EUR } = require("../pusat/constants");

const DEFAULT_POLICY = Object.freeze({
  version: "signature-policy-v1-defaults",
  requiresBusinessApproval: true,
  highValueEur: 150,
  highProfitEur: 25,
  minNetProfitEur: MIN_NET_PROFIT_EUR,
  undercutImplemented: false,
  note: "Numeric thresholds are safe defaults for tests. Do not treat them as approved production rules.",
});

function evaluate(input = {}) {
  const policy = { ...DEFAULT_POLICY, ...(input.policy || {}) };
  const sale = Number(input.salePrice);
  const cost = Number(input.acquisitionCost);
  const profit = Number.isFinite(input.expectedNetProfit)
    ? Number(input.expectedNetProfit)
    : Number.isFinite(sale) && Number.isFinite(cost)
      ? sale - cost - Number(input.signatureSurcharge || 0)
      : null;
  const reasons = [];
  let mandatory = false;
  let review = false;

  if (profit != null && profit + 1e-9 < policy.minNetProfitEur) {
    reasons.push("BELOW_MIN_NET_PROFIT");
    review = true;
  }
  if (Number.isFinite(sale) && sale >= policy.highValueEur) {
    reasons.push("HIGH_VALUE_DEFAULT");
    mandatory = true;
  }
  if (profit != null && profit >= policy.highProfitEur) {
    reasons.push("HIGH_PROFIT_DEFAULT");
    mandatory = true;
  }
  if (input.riskOutcome === "HIGH_RISK_BLOCKED") {
    reasons.push("HIGH_RISK_BLOCKED");
    return {
      ok: true,
      requireSignature: true,
      allowAutomaticShipment: false,
      reason: "HIGH_RISK_REQUIRES_REVIEW",
      reasons,
      policy,
      customerOverrideAllowed: false,
    };
  }
  if (input.riskOutcome === "REVIEW_REQUIRED") {
    reasons.push("RISK_REVIEW");
    review = true;
  }

  if (mandatory && input.carrierSupportsSignature === false) {
    reasons.push("CARRIER_SIGNATURE_UNAVAILABLE");
    if (input.approvedAlternativeSupportsSignature === true) {
      reasons.push("APPROVED_ALTERNATIVE");
    } else {
      return {
        ok: true,
        requireSignature: true,
        allowAutomaticShipment: false,
        reason: "NO_SUITABLE_SIGNATURE_SERVICE",
        reasons,
        policy,
        customerOverrideAllowed: false,
      };
    }
  }

  if (input.customerDeclinesSignature === true && mandatory) {
    reasons.push("CUSTOMER_PREFERENCE_IGNORED");
  }

  return {
    ok: true,
    requireSignature: mandatory,
    allowAutomaticShipment: !review && (input.carrierSupportsSignature !== false || !mandatory),
    reasons,
    expectedNetProfit: profit,
    surcharge: Number(input.signatureSurcharge || 0),
    policy,
    customerOverrideAllowed: false,
    liabilityWaiverInvented: false,
    legalReviewFlag: input.customerDeclinesSignature === true,
  };
}

module.exports = { evaluate, DEFAULT_POLICY };
