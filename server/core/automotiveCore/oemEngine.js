/**
 * Automotive Core — OEM cross-reference engine (no automatic equivalence).
 */
const CONFIDENCE = Object.freeze(["EXACT", "HIGH", "MEDIUM", "LOW", "UNKNOWN"]);

function normalizeOemNumber(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function registerCrossReference(entry = {}) {
  const oem = normalizeOemNumber(entry.oem);
  const replacement = normalizeOemNumber(entry.replacement || entry.supersession);
  const confidence = entry.confidence || "UNKNOWN";
  const source = entry.source || "manual";

  if (!oem) {
    return { ok: false, status: "REVIEW_REQUIRED", reason: "missing_oem" };
  }

  return {
    ok: true,
    oem,
    replacement: replacement || null,
    confidence,
    source,
    status: confidence === "EXACT" || confidence === "HIGH" ? "PASS" : "REVIEW_REQUIRED",
    autoEquivalent: false,
    evidence: entry.evidence || [],
  };
}

function compareOemNumbers(a, b, options = {}) {
  const oemA = normalizeOemNumber(a);
  const oemB = normalizeOemNumber(b);
  if (!oemA || !oemB) return { equivalent: false, confidence: "UNKNOWN", status: "REVIEW_REQUIRED" };
  if (oemA === oemB) {
    return { equivalent: true, confidence: "EXACT", status: "PASS", source: options.source || "direct_match" };
  }
  return { equivalent: false, confidence: "UNKNOWN", status: "REVIEW_REQUIRED", source: options.source || "none" };
}

module.exports = {
  CONFIDENCE,
  normalizeOemNumber,
  registerCrossReference,
  compareOemNumbers,
};
