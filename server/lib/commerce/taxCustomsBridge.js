/**
 * Tax AI ↔ Customs AI exchange. Uncertainty never becomes a clearance.
 */
function exchangeClassification({ hsCode, originCountry, destCountry, vatKnown, dualUse, licenseOk } = {}) {
  const hs = String(hsCode || "").trim();
  const missing = [];
  if (!hs) missing.push("hsCode");
  if (!originCountry) missing.push("originCountry");
  if (!destCountry) missing.push("destCountry");
  if (vatKnown !== true) missing.push("vatKnown");
  if (dualUse === true && licenseOk !== true) {
    return {
      ok: false,
      hold: true,
      code: "HUMAN_REVIEW",
      reason: "DUAL_USE_LICENSE_UNVERIFIED",
      missing,
    };
  }
  if (missing.length) {
    return { ok: false, hold: true, code: "HUMAN_REVIEW", reason: "CLASSIFICATION_INCOMPLETE", missing };
  }
  return {
    ok: true,
    hold: false,
    code: "EXCHANGE_RECORDED",
    hsCode: hs,
    originCountry,
    destCountry,
    note: "Recorded for review. Not a live customs filing or tax payment.",
  };
}

module.exports = { exchangeClassification };
