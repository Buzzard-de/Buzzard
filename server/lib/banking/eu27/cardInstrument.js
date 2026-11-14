/**
 * Card references stay fiat. They are not crypto and they are not stored.
 */
const { decideAsset } = require("./fiatPolicy");

function compactDigits(value) {
  return String(value || "").replace(/[\s-]/g, "");
}

function classifySubject(value) {
  if (value == null || String(value).trim() === "") {
    return { ok: true, code: "NO_SUBJECT", assetClass: "none", crypto: false, stored: false };
  }
  const raw = String(value).trim();
  if (/^\d{13,19}$/.test(compactDigits(raw))) {
    return { ok: false, code: "CARD_DATA_REJECTED", assetClass: "fiat_card_pan", crypto: false, stored: false };
  }
  const policy = decideAsset({ currency: raw, assetType: "fiat", instrument: raw });
  if (!policy.ok && policy.code !== "REJECTED_UNKNOWN_ASSET") {
    return { ok: false, code: policy.code, assetClass: policy.assetClass || "unknown", crypto: policy.code === "REJECTED_CRYPTO_POLICY", stored: false };
  }
  if (/^0x[a-fA-F0-9]{40}$/.test(raw)) {
    return { ok: false, code: "REJECTED_CRYPTO_POLICY", assetClass: "crypto", crypto: true, stored: false };
  }
  return { ok: true, code: "FIAT_REFERENCE", assetClass: "fiat_card_token", crypto: false, stored: false };
}

module.exports = { classifySubject };
