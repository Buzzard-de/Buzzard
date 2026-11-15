/**
 * Tuncay compliance adapter. UNKNOWN ≠ CLEAR. No list download.
 */
function screen({ origin, destination, product, endUser } = {}) {
  const missing = [origin, destination, product, endUser].some((v) => v == null || v === "");
  if (missing) {
    return { ok: true, decision: "UNKNOWN", clear: false, hold: true, liveLists: false };
  }
  return {
    ok: true,
    decision: "UNKNOWN",
    clear: false,
    hold: true,
    confidence: "UNVERIFIED",
    sourceDate: null,
    liveLists: false,
    autoDeclaration: false,
  };
}

module.exports = { screen };
