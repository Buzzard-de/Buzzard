/**
 * Automotive Core — fitment engine with confidence levels and evidence.
 */
const { normalizeFitmentEntry, validateFitmentRecord } = require("../../lib/pim/fitmentSchema");
const vehicleEngine = require("./vehicleEngine");

const CONFIDENCE_LEVELS = Object.freeze(["EXACT", "HIGH", "MEDIUM", "LOW", "UNKNOWN"]);

function scoreToLevel(score) {
  if (score >= 0.95) return "EXACT";
  if (score >= 0.8) return "HIGH";
  if (score >= 0.6) return "MEDIUM";
  if (score >= 0.3) return "LOW";
  return "UNKNOWN";
}

function normalizeFitment(raw = {}) {
  return normalizeFitmentEntry(raw);
}

function validateFitment(fitment = {}) {
  const result = validateFitmentRecord(fitment);
  const level = result.valid ? "HIGH" : "UNKNOWN";
  return {
    ...result,
    level,
    status: result.valid ? "PASS" : "REVIEW_REQUIRED",
  };
}

function matchFitment(product = {}, vehicleQuery = {}) {
  const fitments = product.fitment || product.vehicleFitment || product.compatibleVehicles || [];
  if (!fitments.length) {
    return { match: false, confidence: 0, level: "UNKNOWN", status: "REVIEW_REQUIRED", evidence: [] };
  }

  let best = { match: false, confidence: 0, level: "UNKNOWN", fitment: null, evidence: [] };

  for (const raw of fitments) {
    const fit = normalizeFitment(raw);
    const vehicleMatch = vehicleEngine.matchVehicle({ compatibleVehicles: [fit] }, vehicleQuery);
    const score = vehicleMatch.confidence || 0;
    const level = scoreToLevel(score);
    const evidence = [{ source: fit.source || "product_data", fitment: fit, score, level }];

    if (score > best.confidence) {
      best = {
        match: vehicleMatch.match,
        confidence: score,
        level,
        fitment: fit,
        evidence,
        status: level === "UNKNOWN" || level === "LOW" ? "REVIEW_REQUIRED" : "PASS",
      };
    }
  }

  return best;
}

function scoreFitment(product = {}, vehicleQuery = {}) {
  return matchFitment(product, vehicleQuery);
}

function explainFitmentMatch(product = {}, vehicleQuery = {}) {
  const result = matchFitment(product, vehicleQuery);
  return {
    vehicle: vehicleQuery,
    product: product.sku || product.id,
    confidence: result.confidence,
    level: result.level,
    source: result.fitment?.source || "unknown",
    evidence: result.evidence,
    eligibleForApproval: result.level === "EXACT",
    requiresReview: ["MEDIUM", "LOW", "UNKNOWN"].includes(result.level),
  };
}

module.exports = {
  CONFIDENCE_LEVELS,
  normalizeFitment,
  validateFitment,
  matchFitment,
  scoreFitment,
  explainFitmentMatch,
  scoreToLevel,
};
