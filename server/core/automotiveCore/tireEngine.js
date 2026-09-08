/**
 * Tire size normalization and search — extends unitLocalization patterns.
 */
const TIRE_PATTERNS = [
  /^(\d{3})\/(\d{2})\s*[rR]\s*(\d{2}(?:\.\d)?)(?:\s*[A-Z]\d*)?$/,
  /^(\d{3})\/(\d{2})[rR](\d{2}(?:\.\d)?)([A-Z]\d*)?$/,
  /^(\d{3})\s+(\d{2})\s+[rR]\s*(\d{2})$/,
  /^LT(\d{3})\/(\d{2})[rR](\d{2})$/,
  /^(\d{2,3})x(\d{2}\.?\d*)\s*[rR]\s*(\d{2})$/,
  /^(\d{3})\/(\d{2})\s*[rR]\s*(\d{2}\.?\d*)$/,
];

function parseTireSize(input) {
  const raw = String(input || "").trim();
  if (!raw) return null;

  for (const pattern of TIRE_PATTERNS) {
    const m = raw.match(pattern);
    if (m) {
      return {
        raw,
        width: Number(m[1]),
        aspectRatio: Number(m[2]),
        rimDiameter: Number.parseFloat(m[3]),
        loadSpeed: String(m[4] || "").trim() || null,
        construction: raw.toUpperCase().includes("LT") ? "LT" : "R",
        normalized: `${m[1]}/${m[2]} R${m[3]}`,
      };
    }
  }
  return null;
}

function normalizeTireSize(input) {
  const parsed = parseTireSize(input);
  return parsed ? parsed.normalized : null;
}

function isValidTireSize(input) {
  const parsed = parseTireSize(input);
  if (!parsed) return false;
  return (
    parsed.width >= 125 &&
    parsed.width <= 500 &&
    parsed.aspectRatio >= 25 &&
    parsed.aspectRatio <= 90 &&
    parsed.rimDiameter >= 10 &&
    parsed.rimDiameter <= 24.5
  );
}

function buildTireSearchTokens(input) {
  const parsed = parseTireSize(input);
  if (!parsed) return [];
  return [
    parsed.normalized,
    `${parsed.width}/${parsed.aspectRatio}R${parsed.rimDiameter}`,
    `${parsed.width}${parsed.aspectRatio}R${parsed.rimDiameter}`,
    String(parsed.width),
    String(parsed.rimDiameter),
    parsed.raw,
  ].filter(Boolean);
}

function compareTireSize(a, b) {
  const pa = parseTireSize(a);
  const pb = parseTireSize(b);
  if (!pa || !pb) return { match: false, score: 0 };
  const exact =
    pa.width === pb.width && pa.aspectRatio === pb.aspectRatio && pa.rimDiameter === pb.rimDiameter;
  if (exact) return { match: true, score: 1, level: "EXACT" };
  const rimOnly = pa.rimDiameter === pb.rimDiameter && pa.width === pb.width;
  if (rimOnly) return { match: true, score: 0.7, level: "PARTIAL" };
  return { match: false, score: 0, level: "NONE" };
}

function extractTireFromQuery(query) {
  const text = String(query || "");
  const patterns = [
    /\b(\d{3}\/\d{2}\s*[rR]\s*\d{2}(?:\s*\d{2,3}[A-Z])?)\b/,
    /\bLT(\d{3}\/\d{2}[rR]\d{2})\b/i,
    /\b(\d{2,3}x\d{2}\.?\d*\s*[rR]\s*\d{2})\b/i,
    /\b(\d{3}\/\d{2}[rR]\d{2})\b/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return parseTireSize(m[1]);
  }
  return null;
}

module.exports = {
  parseTireSize,
  normalizeTireSize,
  isValidTireSize,
  buildTireSearchTokens,
  compareTireSize,
  extractTireFromQuery,
};
