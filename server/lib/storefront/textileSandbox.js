/**
 * Textile AI sandbox — rule-based recommendations and demo try-on only. No live model.
 */
const { recommend, demoTryOn, recordMeasurement, sizeAdvice, assessTextile } = require("./textileProgram");
const { evaluateSalesGate } = require("../salesSafetyGate");

function combineOutfit({ pieces = [], audience, occasion } = {}) {
  const primary = recommend({ audience, occasion });
  const lines = [...new Set([primary.line, ...pieces].filter(Boolean))];
  return {
    ok: true,
    lines,
    pieces: lines.map((line) => ({ line, source: "rule_engine" })),
    liveTryOn: false,
    fitGuarantee: false,
    reasons: primary.reasons,
  };
}

function runSandboxSession(input = {}) {
  const sales = evaluateSalesGate();
  if (sales.allowed === true) {
    return { ok: false, code: "SALES_MUST_STAY_LOCKED", live: false, productionReady: false };
  }
  const recommendation = recommend({
    audience: input.audience,
    occasion: input.occasion,
    profession: input.profession,
  });
  const measurement =
    input.measurements && input.consentMeasurements
      ? recordMeasurement({ consentMeasurements: true, values: input.measurements })
      : { ok: false, code: "CONSENT_REQUIRED", stored: false };
  const sizing = sizeAdvice(input.measurements || {});
  const outfit = combineOutfit({
    pieces: input.preferredLines || [],
    audience: input.audience,
    occasion: input.occasion,
  });
  const tryOn =
    input.requestTryOn === true
      ? demoTryOn({ consentPhoto: input.consentPhoto === true, angles: input.angles || ["front"] })
      : null;
  return {
    ok: true,
    sandbox: true,
    live: false,
    liveTryOn: false,
    salesEnabled: false,
    productionReady: false,
    recommendation,
    measurement,
    sizing,
    outfit,
    tryOn,
    status: assessTextile(),
  };
}

module.exports = { combineOutfit, runSandboxSession, assessTextile };