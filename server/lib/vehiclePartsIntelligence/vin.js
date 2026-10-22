/**
 * VIN handling is privacy-first and not authoritative.
 * Full VIN is never persisted. Decoder claims remain unverified.
 */

const crypto = require("crypto");

function normalizeVin(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-HJ-NPR-Z0-9]/g, "");
}

function inspectVin(value) {
  const vin = normalizeVin(value);
  if (!vin) return { ok: false, reason: "missing", decoderAuthoritative: false };
  if (vin.length !== 17) return { ok: false, reason: "invalid_length", decoderAuthoritative: false };
  const digest = crypto.createHash("sha256").update(vin).digest("hex").slice(0, 16);
  return {
    ok: true,
    wmi: vin.slice(0, 3),
    vdsLength: 6,
    last6: vin.slice(-6),
    hash: digest,
    fullVinStored: false,
    decoderAuthoritative: false,
    derivedAttributes: null,
    note: "VIN used only to request more configuration; decoder is not treated as catalog authority.",
  };
}

function publicVinView(inspection) {
  if (!inspection?.ok) return { present: false };
  return {
    present: true,
    wmi: inspection.wmi,
    last6: inspection.last6,
    hash: inspection.hash,
    decoderAuthoritative: false,
  };
}

module.exports = { normalizeVin, inspectVin, publicVinView };
