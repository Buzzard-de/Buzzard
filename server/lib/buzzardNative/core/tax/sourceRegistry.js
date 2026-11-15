const crypto = require("crypto");

const SOURCES = Object.freeze([
  {
    id: "ec_vat_rates",
    name: "European Commission VAT rates",
    officialUrl: "https://taxation-customs.ec.europa.eu/vat-rates_en",
    publishedAt: null,
    effectiveAt: null,
    lastVerified: "2026-10-22",
    version: "local-snapshot-ab27Tax",
    reliability: "UNVERIFIED",
    fetchedLive: false,
  },
  {
    id: "eur_lex",
    name: "EUR-Lex",
    officialUrl: "https://eur-lex.europa.eu",
    publishedAt: null,
    effectiveAt: null,
    lastVerified: null,
    version: "schema-only",
    reliability: "UNKNOWN",
    fetchedLive: false,
  },
]);

function record(source) {
  const body = JSON.stringify(source);
  return { ...source, sha256: crypto.createHash("sha256").update(body).digest("hex") };
}

function list() {
  return SOURCES.map(record);
}

function usable(sourceId) {
  const s = list().find((x) => x.id === sourceId);
  if (!s) return { ok: false, code: "UNKNOWN_SOURCE", status: "UNKNOWN" };
  if (s.reliability === "UNKNOWN") return { ok: false, code: "EXPIRED_OR_UNKNOWN_SOURCE", status: "UNKNOWN", source: s };
  if (s.fetchedLive) return { ok: false, code: "LIVE_FETCH_NOT_AUTHORIZED" };
  return { ok: true, status: s.reliability, source: s, liveLegal: false };
}

module.exports = { list, usable, SOURCES };
